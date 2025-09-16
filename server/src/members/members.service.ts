import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';
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

  async findAll(query?: FindMembersQueryDto): Promise<{
    items: Member[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | Member[]> {
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

    qb.skip((page - 1) * limit).take(limit);

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
    const result = await this.memberRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Member #${id} not found`);
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

        const totalLoanAmount = loans.reduce(
          (sum, loan) => sum + Number(loan.principalAmount),
          0,
        );
        const totalBalance = loans.reduce(
          (sum, loan) => sum + Number(loan.balance),
          0,
        );

        // Calculate overall amount (principal + interest)
        const overallAmount = loans.reduce(
          (sum, loan) => sum + Number(loan.totalAmount),
          0,
        );

        // Calculate weekly payment amount (sum of all active loans' weekly payments)
        const weeklyPaymentAmount = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.weeklyPaymentAmount), 0);

        // Calculate total term weeks (sum of all active loans' terms)
        const totalTermWeeks = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.termWeeks), 0);

        // Calculate total savings (sum of all loans' savings)
        const totalSavings = loans.reduce(
          (sum, loan) => sum + Number(loan.savings),
          0,
        );

        // Sum of net cash released across all loans (reloans)
        const netCashReleased = loans.reduce(
          (sum, loan) => sum + Number((loan as any).netCashReleased || 0),
          0,
        );

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
