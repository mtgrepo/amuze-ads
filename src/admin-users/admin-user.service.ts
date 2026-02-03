import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdminUser } from "./entities/admin-user.entity";
import { Repository } from "typeorm";
import { hashPassword } from "src/common/utils/password.utils";

@Injectable()
export class AdminUserService {
    constructor(
        @InjectRepository(AdminUser)
        private adminUserRepository: Repository<AdminUser>,
    ) {}

    async createAdminUser(adminUserData: Partial<AdminUser>): Promise<AdminUser> {
        try {
            if (adminUserData.password) {
                adminUserData.password = await hashPassword(adminUserData.password);
            }
            const adminUser = this.adminUserRepository.create(adminUserData);
            return await this.adminUserRepository.save(adminUser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdminUserList(): Promise<AdminUser[]> {
        try {
            return await this.adminUserRepository.find();
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdminUserById(id: string): Promise<AdminUser> {
        try {
            const adminUser = await this.adminUserRepository.findOneBy({ id });
            if (!adminUser) {
                throw new NotAcceptableException("Admin user not found");
            }
            return adminUser;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateAdminUser(id: string, updateData: Partial<AdminUser>): Promise<AdminUser> {
        try {
            const adminUser = await this.findAdminUserById(id);
            if (!adminUser) {
                throw new NotAcceptableException("Admin user not found");
            }
            if (updateData.password) {
                updateData.password = await hashPassword(updateData.password);
            }
            Object.assign(adminUser, updateData);
            return await this.adminUserRepository.save(adminUser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdminUserByEmail(email: string): Promise<AdminUser | null> {
        try {
            return await this.adminUserRepository.findOneBy({ email });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async deleteAdminUser(id: string): Promise<AdminUser> {
        try {
            const adminUser = await this.findAdminUserById(id);
            if (!adminUser) {
                throw new NotAcceptableException("Admin user not found");
            }
            return await this.adminUserRepository.remove(adminUser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

}