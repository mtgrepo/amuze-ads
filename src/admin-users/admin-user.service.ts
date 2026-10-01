import { Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AdminUser } from "./entities/admin-user.entity";
import { Repository } from "typeorm";

@Injectable()
export class AdminUserService {
    constructor(
        @InjectRepository(AdminUser)
        private adminUserRepository: Repository<AdminUser>,
    ) {}

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

    async findByAmuzeUserId(amuzeUserId: string): Promise<AdminUser | null> {
        return this.adminUserRepository.findOneBy({ amuzeUserId });
    }

    /** First visit from AMUZE creates the admin; later visits refresh name, phone and last login. isActive is never changed here. */
    async upsertFromAmuze(claims: { amuzeUserId: string; name: string; phone: string | null }): Promise<AdminUser> {
        const existing = await this.findByAmuzeUserId(claims.amuzeUserId);
        const admin = existing ?? this.adminUserRepository.create({ amuzeUserId: claims.amuzeUserId });
        admin.name = claims.name;
        admin.phone = claims.phone;
        admin.lastLogin = new Date();
        return this.adminUserRepository.save(admin);
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