import { BadRequestException, ForbiddenException, Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Advertiser } from "./entities/advertiser.entity";
import { hashPassword } from "src/common/utils/password.utils";
import { NotificationService } from "src/notifications/notification.service";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CreateAccountDTO } from "./dto/create-account.dto";
import { CreateClientDTO } from "./dto/create-client.dto";
import { PointLedger } from "src/points/entities/point-ledger.entity";
import { AdvertiserProfile } from "src/advertiser-profile/entities/advertiser-profile.entity";
import { MinioService } from "src/minio/minio.service";
import { RegisterAdvertiserDTO } from "./dto/register-advertiser.dto";

const DEFAULT_COUNTRY = 'Myanmar';
const DEFAULT_TIMEZONE = 'Asia/Yangon';

@Injectable()
export class AdvertiserService {
    constructor(
        @InjectRepository(Advertiser)
        private advertiserRepository: Repository<Advertiser>,
        private readonly notificationService: NotificationService,
        private readonly minioService: MinioService,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    /**
     * Public sign-up: creates the account and its business profile together, so neither exists without the other.
     * New accounts are always unverified; an admin verifies them before they can log in.
     */
    async register(dto: RegisterAdvertiserDTO, logo?: Express.Multer.File): Promise<{ id: string; name: string; email: string | null; type: string }> {
        const email = dto.email.trim().toLowerCase();
        if (await this.advertiserRepository.exists({ where: { email } })) {
            throw new BadRequestException('An account with this email already exists');
        }

        // Upload before the transaction so a failed upload saves nothing; remove it again if the save fails.
        const photo = logo ? await this.minioService.upload(logo, `advertiser-profiles/${dto.business_name}`) : null;
        try {
            return await this.dataSource.transaction(async (manager) => {
                const advertiser = await manager.save(manager.create(Advertiser, {
                    type: dto.type,
                    name: dto.name.trim(),
                    email,
                    phone: dto.phone.trim(),
                    password: await hashPassword(dto.password),
                    status: 'active',
                    verified: false,
                    agencyId: null,
                }));
                await manager.save(manager.create(AdvertiserProfile, {
                    advertiser_id: advertiser.id,
                    business_name: dto.business_name.trim(),
                    business_no: dto.business_no.trim(),
                    business_type: dto.business_type.trim(),
                    dica_number: dto.dica_number.trim(),
                    address: dto.address.trim(),
                    website: dto.website?.trim() || null,
                    country: dto.country || DEFAULT_COUNTRY,
                    timezone: dto.timezone || DEFAULT_TIMEZONE,
                    photo,
                }));
                return { id: advertiser.id, name: advertiser.name, email: advertiser.email, type: advertiser.type };
            });
        } catch (error) {
            if (photo) {
                await this.minioService.delete(photo).catch(() => undefined);
            }
            throw new BadRequestException(error.message);
        }
    }

    async createAdvertiser(advertiserData: Partial<Advertiser>): Promise<Advertiser> {
        try {
            // Explicit fields only: the body is unwhitelisted, and relation keys
            // (agency, clients, id) would otherwise link this account to others.
            const advertiser = this.advertiserRepository.create({
                name: advertiserData.name,
                email: advertiserData.email,
                phone: advertiserData.phone,
                status: advertiserData.status,
                verified: advertiserData.verified,
                password: advertiserData.password ? await hashPassword(advertiserData.password) : advertiserData.password,
                type: advertiserData.type,
                agencyId: null,
            });
            return await this.advertiserRepository.save(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async createAccount(dto: CreateAccountDTO): Promise<Advertiser> {
        if (dto.agencyId) {
            if (dto.type !== 'advertiser') {
                throw new BadRequestException('Only an advertiser can belong to an agency');
            }
            const agency = await this.advertiserRepository.findOne({ where: { id: dto.agencyId }, select: ['id', 'type'] });
            if (!agency || agency.type !== 'agency') {
                throw new BadRequestException('agencyId must reference an agency account');
            }
        }
        try {
            const advertiser = this.advertiserRepository.create({
                name: dto.name,
                type: dto.type,
                agencyId: dto.agencyId ?? null,
                email: dto.email || null,
                phone: dto.phone,
                status: dto.status,
                verified: dto.verified,
                password: dto.agencyId ? null : await hashPassword(dto.password!),
            });
            return await this.advertiserRepository.save(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async createClientForAgency(agencyId: string, dto: CreateClientDTO): Promise<Advertiser> {
        try {
            const client = this.advertiserRepository.create({
                name: dto.name,
                email: dto.email || null,
                phone: dto.phone,
                type: 'advertiser',
                agencyId,
                status: 'active',
                verified: true,
                password: null,
            });
            return await this.advertiserRepository.save(client);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findClientsOfAgency(agencyId: string): Promise<Advertiser[]> {
        try {
            return await this.advertiserRepository.find({
                where: { agencyId },
                relations: { profiles: true },
                select: {
                    id: true, name: true, email: true, phone: true, status: true, verified: true, createdAt: true, updatedAt: true,
                    profiles: { id: true },
                },
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    /** The advertiser a create request acts for. Agencies can never be the target. */
    async resolveTargetAdvertiserId(user: CurrentUserPayload, requestedId?: string): Promise<string> {
        if (user.role === 'advertiser') {
            return user.id;
        }
        if (user.role !== 'admin' && user.role !== 'agency') {
            throw new ForbiddenException('You cannot act for an advertiser');
        }
        if (!requestedId) {
            throw new BadRequestException('advertiserId is required');
        }
        const target = await this.advertiserRepository.findOne({ where: { id: requestedId }, select: ['id', 'type', 'agencyId', 'status'] });
        if (!target || target.type !== 'advertiser') {
            throw new BadRequestException('advertiserId must reference an advertiser account');
        }
        if (target.status === 'inactive') {
            throw new BadRequestException('This advertiser is inactive');
        }
        if (user.role === 'agency' && target.agencyId !== user.id) {
            throw new ForbiddenException('This advertiser is not one of your clients');
        }
        return target.id;
    }

    /** Advertiser ids whose data the user may list. undefined = no restriction (admin). */
    async getScopedAdvertiserIds(user: CurrentUserPayload): Promise<string[] | undefined> {
        if (user.role === 'admin') {
            return undefined;
        }
        if (user.role === 'agency') {
            const clients = await this.advertiserRepository.find({ where: { agencyId: user.id }, select: ['id'] });
            return clients.map((c) => c.id);
        }
        return [user.id];
    }

    /** Whether the user may view/act on data owned by ownerId. */
    async canAccessAdvertiser(user: CurrentUserPayload, ownerId: string): Promise<boolean> {
        if (user.role === 'admin') {
            return true;
        }
        if (user.role === 'advertiser') {
            return ownerId === user.id;
        }
        if (user.role === 'agency') {
            const owner = await this.advertiserRepository.findOne({ where: { id: ownerId }, select: ['id', 'agencyId'] });
            return owner?.agencyId === user.id;
        }
        return false;
    }

    /** Who pays for a campaign owned by advertiserId: the agency for clients, else the advertiser. */
    async resolvePayerId(advertiserId: string): Promise<string> {
        const advertiser = await this.advertiserRepository.findOne({ where: { id: advertiserId }, select: ['id', 'agencyId'] });
        if (!advertiser) {
            throw new BadRequestException('Advertiser not found');
        }
        return advertiser.agencyId ?? advertiser.id;
    }

    /** Whether the user may view/edit this account's own details and business profile. */
    async canManageAccount(user: CurrentUserPayload, accountId: string): Promise<boolean> {
        if (user.role === 'admin' || user.id === accountId) {
            return true;
        }
        if (user.role === 'agency') {
            const account = await this.advertiserRepository.findOne({ where: { id: accountId }, select: ['id', 'agencyId'] });
            return account?.agencyId === user.id;
        }
        return false;
    }

    async findAccountSummary(id: string): Promise<{ id: string; name: string; agencyId: string | null } | null> {
        return this.advertiserRepository.findOne({ where: { id }, select: ['id', 'name', 'agencyId'] });
    }

    /**
     * Advertiser ids a list/stats query should cover.
     * No requestedId → everything the user may see. An agency id → all of that agency's clients combined.
     * Any other id → just that advertiser, if the user may see it.
     */
    async resolveListScope(user: CurrentUserPayload, requestedId?: string): Promise<string[] | undefined> {
        if (!requestedId) {
            return this.getScopedAdvertiserIds(user);
        }
        const requested = await this.advertiserRepository.findOne({ where: { id: requestedId }, select: ['id', 'type'] });
        if (requested?.type === 'agency') {
            if (user.role !== 'admin' && user.id !== requested.id) {
                throw new ForbiddenException('You cannot view this advertiser');
            }
            const clients = await this.advertiserRepository.find({ where: { agencyId: requested.id }, select: ['id'] });
            return clients.map((c) => c.id);
        }
        if (!(await this.canAccessAdvertiser(user, requestedId))) {
            throw new ForbiddenException('You cannot view this advertiser');
        }
        return [requestedId];
    }

    async findAdvertiserList(): Promise<Advertiser[]> {
        try {
            return await this.advertiserRepository.find({
                relations: { agency: true },
                select: {
                    id: true, name: true, email: true, phone: true, status: true, verified: true,
                    type: true, agencyId: true, lastLogin: true, createdAt: true, updatedAt: true,
                    agency: { id: true, name: true },
                },
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdvertiserByEmail(email: string): Promise<Advertiser | null> {
        try {
            return await this.advertiserRepository.findOne({
                where: { email },
                select: ['id', 'name', 'email', 'password', 'verified', 'status', 'type', 'agencyId'],
            });
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async findAdvertiserById(id: string): Promise<Advertiser> {
        try {
            const advertiser = await this.advertiserRepository.findOne({
                where: { id },
                relations: ['profiles'],
                select: ['id', 'name', 'email', 'phone', 'status', 'verified', 'type', 'agencyId', 'lastLogin', 'createdAt', 'updatedAt'],
            });
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            return advertiser;
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async updateAdvertiser(id: string, updateData: Partial<Advertiser>): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            // Explicit fields only: an unwhitelisted body could otherwise swap `id`
            // (retargeting the save to another row) or set type/agency relations.
            const editable: Partial<Advertiser> = {};
            if (updateData.name !== undefined) editable.name = updateData.name;
            if (updateData.email !== undefined) editable.email = updateData.email;
            if (updateData.phone !== undefined) editable.phone = updateData.phone;
            if (updateData.status !== undefined) editable.status = updateData.status;
            if (updateData.verified !== undefined) editable.verified = updateData.verified;
            if (updateData.password) editable.password = await hashPassword(updateData.password);
            Object.assign(advertiser, editable);
            return await this.advertiserRepository.save(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async changeVerifyStatus(id: string, verified: boolean): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            advertiser.verified = verified;
            const advertiserData = await this.advertiserRepository.save(advertiser);

            this.notificationService.createNotification({
                advertiserId: advertiserData.id,
                title: "Notification about Account Verify Status",
                message: `Your User Account has been verified !`
            })

            return advertiserData
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async changeActiveStatus(id: string, status: string): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            advertiser.status = status;
            const advertiserData = await this.advertiserRepository.save(advertiser);

            this.notificationService.createNotification({
                advertiserId: advertiserData.id,
                title: "Notification about Account Status",
                message: `Your User Account is ${status} !`
            })

            return advertiserData
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }

    async deleteAdvertiser(id: string): Promise<Advertiser> {
        try {
            const advertiser = await this.findAdvertiserById(id);
            if (!advertiser) {
                throw new NotAcceptableException("Advertiser not found");
            }
            const clientCount = await this.advertiserRepository.count({ where: { agencyId: id } });
            if (clientCount > 0) {
                throw new NotAcceptableException(`This agency still has ${clientCount} client(s); delete them first`);
            }
            // Deleting would cascade away the points ledger and money records; keep the audit trail.
            const pointsHistory = await this.advertiserRepository.manager.count(PointLedger, { where: { advertiserId: id } });
            if (pointsHistory > 0) {
                throw new NotAcceptableException('This account has points history and cannot be deleted; deactivate it instead');
            }
            return await this.advertiserRepository.remove(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }
}
