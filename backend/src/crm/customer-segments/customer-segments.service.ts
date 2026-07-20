import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerSegmentDto } from './dto/create-customer-segment.dto';
import { UpdateCustomerSegmentDto } from './dto/update-customer-segment.dto';

const DEFAULT_B2B_SEGMENTS = [
  { name: 'Distributor', segmentType: 'B2B', color: 'bg-green-500', sortOrder: 1 },
  { name: 'Dealer', segmentType: 'B2B', color: 'bg-blue-500', sortOrder: 2 },
  { name: 'Wholesaler', segmentType: 'B2B', color: 'bg-indigo-500', sortOrder: 3 },
  { name: 'Retailer', segmentType: 'B2B', color: 'bg-orange-500', sortOrder: 4 },
  { name: 'Corporate', segmentType: 'B2B', color: 'bg-purple-500', sortOrder: 5 },
  { name: 'Manufacturer', segmentType: 'B2B', color: 'bg-red-500', sortOrder: 6 },
  { name: 'Hospital', segmentType: 'B2B', color: 'bg-pink-500', sortOrder: 7 },
  { name: 'Educational Institution', segmentType: 'B2B', color: 'bg-yellow-500', sortOrder: 8 },
  { name: 'Government', segmentType: 'B2B', color: 'bg-teal-500', sortOrder: 9 },
  { name: 'Other B2B', segmentType: 'B2B', color: 'bg-gray-500', sortOrder: 99 }
];

const DEFAULT_B2C_SEGMENTS = [
  { name: 'Individual', segmentType: 'B2C', color: 'bg-blue-400', sortOrder: 1 },
  { name: 'VIP Customer', segmentType: 'B2C', color: 'bg-purple-600', sortOrder: 2 },
  { name: 'Regular Customer', segmentType: 'B2C', color: 'bg-green-400', sortOrder: 3 },
  { name: 'Walk-in Customer', segmentType: 'B2C', color: 'bg-yellow-400', sortOrder: 4 },
  { name: 'Other B2C', segmentType: 'B2C', color: 'bg-gray-500', sortOrder: 99 }
];

@Injectable()
export class CustomerSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultSegments(companyId: string, userId: string) {
    const existing = await this.prisma.customerSegment.count({
      where: { companyId }
    });

    if (existing === 0) {
      const segmentsToCreate = [...DEFAULT_B2B_SEGMENTS, ...DEFAULT_B2C_SEGMENTS].map(s => ({
        ...s,
        companyId,
        createdBy: userId,
        isActive: true,
        isDefault: true
      }));

      await this.prisma.customerSegment.createMany({
        data: segmentsToCreate,
        skipDuplicates: true
      });
    }
  }

  async findAll(companyId: string, userId: string) {
    // Lazy seed
    await this.seedDefaultSegments(companyId, userId);

    return this.prisma.customerSegment.findMany({
      where: { companyId },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  async findOne(id: string, companyId: string) {
    const segment = await this.prisma.customerSegment.findUnique({
      where: { id }
    });

    if (!segment || segment.companyId !== companyId) {
      throw new NotFoundException('Customer segment not found');
    }

    return segment;
  }

  async create(companyId: string, userId: string, data: CreateCustomerSegmentDto) {
    const existing = await this.prisma.customerSegment.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: data.name
        }
      }
    });

    if (existing) {
      throw new ConflictException('Segment with this name already exists');
    }

    return this.prisma.customerSegment.create({
      data: {
        ...data,
        companyId,
        createdBy: userId
      }
    });
  }

  async update(id: string, companyId: string, data: UpdateCustomerSegmentDto) {
    await this.findOne(id, companyId); // Validate existence and tenant

    if (data.name) {
      const existing = await this.prisma.customerSegment.findFirst({
        where: {
          companyId,
          name: data.name,
          id: { not: id }
        }
      });
      if (existing) {
        throw new ConflictException('Segment with this name already exists');
      }
    }

    return this.prisma.customerSegment.update({
      where: { id },
      data
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId); // Validate existence and tenant

    // Check if being used
    const inUse = await this.prisma.businessPartner.findFirst({
      where: { customerSegmentId: id, companyId }
    });

    if (inUse) {
      throw new ConflictException('Cannot delete segment that is currently assigned to customers');
    }

    return this.prisma.customerSegment.delete({
      where: { id }
    });
  }
}
