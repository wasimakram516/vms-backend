import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { OtpVerificationsService } from '../otp-verifications/otp-verifications.service.js';

const REFRESH_COOKIE = 'refreshToken';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpVerificationsService,
  ) {}

  // user login
  @ApiOperation({ summary: 'Login with email and password' })
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(body.email, body.password);
    const { accessToken, refreshToken } = await this.authService.login(user);

    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production';

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      path: '/',
    });

    return { accessToken };
  }

  // refresh — verifies cookie, rotates both tokens and sets new refresh cookie
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { accessToken, refreshToken } = await this.authService.refresh(token);

    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production';

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { accessToken };
  }

  // logout — requires valid access token, clears the refresh token cookie
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { message: 'Logged out successfully' };
  }

  // get current authenticated user
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: any) {
    return user;
  }

  // send OTP to visitor email or phone
  @ApiOperation({ summary: 'Send OTP to visitor email or phone' })
  @Post('otp/send')
  async sendOtp(@Body() body: SendOtpDto) {
    await this.otpService.sendOtp(body.target);
    return { message: 'OTP sent' };
  }

  // verify OTP and return visitor identity
  @ApiOperation({ summary: 'Verify OTP and return visitor identity' })
  @Post('otp/verify')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.otpService.verifyOtp(body.target, body.code);
  }
}
