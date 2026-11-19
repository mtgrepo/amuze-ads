import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";
import { AdDisplayRulesService } from "./ad-display-rules.service";
import { UpdateAdDisplayRuleDto } from "./dto/update-ad-display-rule.dto";

/** Admins set when the app shows each ad slot. The app reads the result from GET /ad-serving/rules. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('ad-display-rules')
export class AdDisplayRulesController {
    constructor(private readonly rules: AdDisplayRulesService) {}

    @Get()
    async list() {
        return { data: await this.rules.list(), message: 'Display rules retrieved successfully' };
    }

    @Patch(':type/:placement')
    async update(@Param('type') type: string, @Param('placement') placement: string, @Body() dto: UpdateAdDisplayRuleDto) {
        return { data: await this.rules.update(type, placement, dto), message: 'Display rule saved' };
    }
}
