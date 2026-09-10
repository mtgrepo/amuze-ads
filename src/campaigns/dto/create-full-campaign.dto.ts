import { IsIn, IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";

const ASSET_TYPES = ['image', 'video'];
const GENDERS = ['male', 'female', 'all'];
const AD_TYPES = ['banner', 'interstitial', 'reward_video', 'native', 'splash'];
const BUDGET_PLANS = ['daily', 'total'];

export class CreateFullCampaignDto {
    @IsOptional()
    @IsString()
    advertiserId?: string

    @IsNotEmpty()
    @IsString()
    name: string

    @IsNotEmpty()
    @IsIn(BUDGET_PLANS)
    budgetPlan: string

    @IsNotEmpty()
    @IsNumberString()
    dailyBudget: string

    @IsNotEmpty()
    @IsNumberString()
    totalBudget: string

    @IsNotEmpty()
    @IsString()
    startDate: string

    @IsNotEmpty()
    @IsString()
    endDate: string

    @IsNotEmpty()
    @IsString()
    paymentMethod: string

    @IsNotEmpty()
    @IsString()
    creativeName: string

    @IsNotEmpty()
    @IsIn(ASSET_TYPES)
    assetType: string

    @IsNotEmpty()
    @IsString()
    destinationLink: string

    @IsNotEmpty()
    @IsNumberString()
    ageMin: string

    @IsNotEmpty()
    @IsNumberString()
    ageMax: string

    @IsNotEmpty()
    @IsIn(GENDERS)
    gender: string

    @IsNotEmpty()
    @IsIn(AD_TYPES)
    adType: string

    @IsNotEmpty()
    @IsString()
    placementKey: string
}
