import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';
import { Center } from '../centers/entities/center.entity';
import { Loan } from '../loans/loan.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

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

  async findAll(): Promise<Member[]> {
    return this.memberRepository.find({
      relations: ['center'],
    });
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

        // Calculate weekly payment amount (sum of all active loans' weekly payments)
        const weeklyPaymentAmount = loans
          .filter((loan) => loan.status === 'active')
          .reduce((sum, loan) => sum + Number(loan.weeklyPaymentAmount), 0);

        // Calculate total savings (sum of all loans' savings)
        const totalSavings = loans.reduce(
          (sum, loan) => sum + Number(loan.savings),
          0,
        );

        return {
          ...member,
          loans,
          totalLoanAmount,
          totalBalance,
          weeklyPaymentAmount,
          totalSavings,
        };
      }),
    );

    return membersWithLoans;
  }
}
