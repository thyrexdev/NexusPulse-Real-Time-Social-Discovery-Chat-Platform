import {
  Controller,
  Post,
  Patch,
  Body,
  Get,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { resolveGeoLocation } from '../common/utils/geo.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('stranger')
  @HttpCode(HttpStatus.CREATED)
  async createStranger(@Req() req: any) {
    const geo = resolveGeoLocation(req.headers, req.socket?.remoteAddress);
    return this.authService.createStranger(geo);
  }

  @Get('geo')
  @HttpCode(HttpStatus.OK)
  async getGeo(@Req() req: any) {
    return resolveGeoLocation(req.headers, req.socket?.remoteAddress);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { username?: string },
  ) {
    return this.authService.updateProfile(user.userId, dto);
  }
}
