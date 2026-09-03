import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Member } from './entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';
import { Repayment } from '../repayments/repayment.entity';
import { Savings } from '../savings/savings.entity';
import { Collection } from '../collections/entities/collection.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { FindMembersQueryDto } from './dto/find-members-query.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    @InjectRepository(Loan)
    private readonly loanRepository: Repository<Loan>,
    @InjectRepository(Repayment)
    private readonly repaymentRepository: Repository<Repayment>,
    @InjectRepository(Savings)
    private readonly savingsRepository: Repository<Savings>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    const { centerId, ...memberData } = createMemberDto;

    let center: Center | undefined = undefined;
    if (centerId) {
      center =
        (await this.centerRepository.findOne({ where: { id: centerId } })) ||
        undefined;
      if (!center) throw new NotFoundException(`Center #${centerId} not found`);
    }

    const member = this.memberRepository.create({
      ...memberData,
      center,
    });
    return this.memberRepository.save(member);
  }

  async findAll(query?: FindMembersQueryDto): Promise<
    | {
        items: Member[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }
    | Member[]
  > {
    // Backward compatibility if no query provided
    if (!query) {
      return this.memberRepository.find({ relations: ['center'] });
    }

    const { page = 1, limit = 10, search, centerId } = query;

    const qb = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.center', 'center');

    if (centerId) {
      qb.andWhere('center.id = :centerId', { centerId });
    }

    if (search && search.trim().length > 0) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(member.firstName) LIKE :term OR LOWER(member.middleName) LIKE :term OR LOWER(member.lastName) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('member.lastName', 'ASC')
      .addOrderBy('member.firstName', 'ASC')
      .addOrderBy('member.middleName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Member> {
    const member = await this.memberRepository.findOne({ where: { id } });
    if (!member) throw new NotFoundException(`Member #${id} not found`);
    return member;
  }

  async update(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const { centerId, ...memberData } = updateMemberDto;

    let center: Center | undefined = undefined;
    if (centerId) {
      center =
        (await this.centerRepository.findOne({ where: { id: centerId } })) ||
        undefined;
      if (!center) throw new NotFoundException(`Center #${centerId} not found`);
    }

    const member = await this.memberRepository.preload({
      id,
      ...memberData,
      center,
    });
    if (!member) throw new NotFoundException(`Member #${id} not found`);
    return this.memberRepository.save(member);
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(Member, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!member) {
        throw new NotFoundException(`Member #${id} not found`);
      }

      const hasFinancialHistory =
        (await manager.exists(Loan, { where: { borrower: { id } } })) ||
        (await manager.exists(Savings, { where: { borrower: { id } } })) ||
        (await manager.exists(Repayment, { where: { member: { id } } })) ||
        (await manager.exists(Collection, { where: { memberId: id } }));

      if (hasFinancialHistory) {
        throw new ConflictException(
          'Member cannot be deleted because financial history exists',
        );
      }

      await manager.delete(Member, { id });
    });
  }

  /**
   * Get all members for a specific center with loan information
   */
  async getCenterMembers(centerId: string) {
    const members = await this.memberRepository.find({
      where: { center: { id: centerId } },
      relations: ['center'],
    });

    // Get loan information for each member
    const membersWithLoans = await Promise.all(
      members.map(async (member) => {
        const loans = await this.loanRepository.find({
          where: { borrower: { id: member.id } },
        });

        const totalLoanAmount = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.principalAmount), 0);
        const totalBalance = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.balance), 0);

        // Calculate overall amount (principal + interest) - only for active loans
        const overallAmount = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.totalAmount), 0);

        // Calculate weekly payment amount (sum of all active loans' weekly payments)
        const weeklyPaymentAmount = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.weeklyPaymentAmount), 0);

        // Calculate total term weeks (sum of all active loans' terms)
        const totalTermWeeks = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.termWeeks), 0);

        // Savings displayed in collections view should reflect the active loan's savings balance only
        const activeLoanSavings =
          loans.find((loan) => loan.status === 'active')?.savings ?? 0;
        const totalSavings = Number(activeLoanSavings) || 0;

        // Sum of net cash released across active loans only (reloans)
        const netCashReleased = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.netCashReleased || 0), 0);

        return {
          ...member,
          loans,
          totalLoanAmount,
          totalBalance,
          overallAmount,
          weeklyPaymentAmount,
          totalTermWeeks,
          totalSavings,
          netCashReleased,
        };
      }),
    );

    return membersWithLoans;
  }
}
