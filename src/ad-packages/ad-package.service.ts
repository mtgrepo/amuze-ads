import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdPackage } from "./entities/ad-package.entity";
import { CreateAdPackageDto } from "./dto/create-ad-package.dto";
import { UpdateAdPackageDto } from "./dto/update-ad-package.dto";

@Injectable()
export class AdPackageService {
    constructor(
        @InjectRepository(AdPackage)
        private readonly packageRepository: Repository<AdPackage>,
    ) {}

    /** What customers can buy. */
    async findActive(): Promise<AdPackage[]> {
        return this.packageRepository.find({ where: { isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } });
    }

    async findAll(): Promise<AdPackage[]> {
        return this.packageRepository.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    }

    async findById(id: string): Promise<AdPackage> {
        const pkg = await this.packageRepository.findOne({ where: { id } });
        if (!pkg) {
            throw new NotFoundException('Package not found');
        }
        return pkg;
    }

    /** A package a new campaign may be bought with. */
    async findBuyable(id: string): Promise<AdPackage> {
        const pkg = await this.findById(id);
        if (!pkg.isActive) {
            throw new BadRequestException('This package is no longer available');
        }
        return pkg;
    }

    async create(dto: CreateAdPackageDto): Promise<AdPackage> {
        await this.assertNameFree(dto.name);
        return this.packageRepository.save(this.packageRepository.create({ ...dto, name: dto.name.trim() }));
    }

    /** Existing campaigns keep their own copy of the package, so edits only affect new purchases. */
    async update(id: string, dto: UpdateAdPackageDto): Promise<AdPackage> {
        const pkg = await this.findById(id);
        if (dto.name !== undefined) {
            dto.name = dto.name.trim();
            await this.assertNameFree(dto.name, id);
        }
        Object.assign(pkg, dto);
        return this.packageRepository.save(pkg);
    }

    async setActive(id: string, isActive: boolean): Promise<AdPackage> {
        const pkg = await this.findById(id);
        pkg.isActive = isActive;
        return this.packageRepository.save(pkg);
    }

    private async assertNameFree(name: string, exceptId?: string): Promise<void> {
        const existing = await this.packageRepository
            .createQueryBuilder('pkg')
            .where('LOWER(pkg.name) = LOWER(:name)', { name: name.trim() })
            .getOne();
        if (existing && existing.id !== exceptId) {
            throw new BadRequestException('A package with this name already exists');
        }
    }
}
