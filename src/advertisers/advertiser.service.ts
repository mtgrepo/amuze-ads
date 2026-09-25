import { BadRequestException, ForbiddenException, Injectable, NotAcceptableException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Advertiser } from "./entities/advertiser.entity";
import { hashPassword } from "src/common/utils/password.utils";
import { NotificationService } from "src/notifications/notification.service";
import type { CurrentUserPayload } from "src/auth/current-user.decorator";
import { CreateAccountDTO } from "./dto/create-account.dto";
import { CreateClientDTO } from "./dto/create-client.dto";

@Injectable()
export class AdvertiserService {
    constructor(
        @InjectRepository(Advertiser)
        private advertiserRepository: Repository<Advertiser>,
        private readonly notificationService: NotificationService
    ) {}

    async createAdvertiser(advertiserData: Partial<Advertiser>): Promise<Advertiser> {
        try {
            if (advertiserData.password) {
                advertiserData.password = await hashPassword(advertiserData.password);
            }
            const advertiser = this.advertiserRepository.create({
                ...advertiserData,
                type: 'advertiser',
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
        const target = await this.advertiserRepository.findOne({ where: { id: requestedId }, select: ['id', 'type', 'agencyId'] });
        if (!target || target.type !== 'advertiser') {
            throw new BadRequestException('advertiserId must reference an advertiser account');
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
     * No requestedId → everything the user may see. With requestedId → just that advertiser, if the user may see it.
     */
    async resolveListScope(user: CurrentUserPayload, requestedId?: string): Promise<string[] | undefined> {
        if (!requestedId) {
            return this.getScopedAdvertiserIds(user);
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
            if (updateData.password) {
                updateData.password = await hashPassword(updateData.password);
            }
            const { type: _type, agencyId: _agencyId, agency: _agency, clients: _clients, ...safeUpdate } = updateData;
            Object.assign(advertiser, safeUpdate);
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
            return await this.advertiserRepository.remove(advertiser);
        } catch (error) {
            throw new NotAcceptableException(error.message);
        }
    }
}
