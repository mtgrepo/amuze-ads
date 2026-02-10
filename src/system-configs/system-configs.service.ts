import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SystemConfig } from "./entities/system-config.entity";
import { CreateSystemConfigDTO } from "./dto/create-system-config.dto";
import { UpdateSystemConfigDTO } from "./dto/update-system-config.dto";

@Injectable()
export class SystemConfigsService {
    constructor(
        @InjectRepository(SystemConfig)
        private systemConfigRepository: Repository<SystemConfig>
    ) {}

    async create(createDto: CreateSystemConfigDTO): Promise<SystemConfig> {
        const config = this.systemConfigRepository.create(createDto);
        return await this.systemConfigRepository.save(config);
    }

    async getAll(): Promise<SystemConfig[]> {
        return await this.systemConfigRepository.find({
            order: { category: 'ASC', configKey: 'ASC' }
        });
    }

    async getByCategory(category: string): Promise<SystemConfig[]> {
        return await this.systemConfigRepository.find({
            where: { category },
            order: { configKey: 'ASC' }
        });
    }

    async getByConfigKey(configKey: string): Promise<SystemConfig> {
        const config = await this.systemConfigRepository.findOne({
            where: { configKey }
        });
        if (!config) {
            throw new NotFoundException(`Config with key '${configKey}' not found`);
        }
        return config;
    }

    async updateById(id: string, updateDto: UpdateSystemConfigDTO): Promise<SystemConfig> {
        const config = await this.systemConfigRepository.findOne({ where: { id } });
        if (!config) {
            throw new NotFoundException(`Config with id '${id}' not found`);
        }
        Object.assign(config, updateDto);
        return await this.systemConfigRepository.save(config);
    }

    async setActiveStatus(id: string, isActive: boolean): Promise<SystemConfig> {
        const config = await this.systemConfigRepository.findOne({ where: { id } });
        if (!config) {
            throw new NotFoundException(`Config with id '${id}' not found`);
        }
        config.isActive = isActive;
        return await this.systemConfigRepository.save(config);
    }
}
