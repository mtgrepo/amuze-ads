import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SystemConfig } from "./entities/system-config.entity";
import { CreateSystemConfigDTO } from "./dto/create-system-config.dto";
import { UpdateSystemConfigDTO } from "./dto/update-system-config.dto";
import { ActivityService } from "src/activity/activity.service";

@Injectable()
export class SystemConfigsService {
    constructor(
        @InjectRepository(SystemConfig)
        private systemConfigRepository: Repository<SystemConfig>,
        private readonly activity: ActivityService,
    ) {}

    async create(createDto: CreateSystemConfigDTO): Promise<SystemConfig> {
        const config = this.systemConfigRepository.create(createDto);
        return await this.activity.withHistory((manager) => manager.save(config), (saved) => ({
            action: 'config.created', entityType: 'system_config', entityId: saved.id,
            summary: `Added setting ${saved.category}.${saved.configKey}`, meta: { value: saved.configValue },
        }));
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
        const before = { ...config };
        Object.assign(config, updateDto);
        return await this.activity.withHistory((manager) => manager.save(config), (saved) => {
            const changes = this.activity.diff(before, saved, ['category', 'configKey', 'configValue', 'description']);
            return Object.keys(changes).length ? {
                action: 'config.updated', entityType: 'system_config', entityId: saved.id,
                summary: `Changed setting ${saved.category}.${saved.configKey}`, changes,
            } : null;
        });
    }

    async setActiveStatus(id: string, isActive: boolean): Promise<SystemConfig> {
        const config = await this.systemConfigRepository.findOne({ where: { id } });
        if (!config) {
            throw new NotFoundException(`Config with id '${id}' not found`);
        }
        config.isActive = isActive;
        return await this.activity.withHistory((manager) => manager.save(config), (saved) => ({
            action: isActive ? 'config.activated' : 'config.deactivated', entityType: 'system_config', entityId: saved.id,
            summary: `${isActive ? 'Turned on' : 'Turned off'} setting ${saved.category}.${saved.configKey}`,
        }));
    }
}
