import { Controller, Post, Get, Body, UsePipes, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginSchema, LoginDto, RefreshSchema, RefreshDto } from './dto/auth.dto';
import { ok } from '../common/types/api-response';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiBody({ schema: { properties: { email: { type: 'string', example: 'admin@flowforge.dev' }, password: { type: 'string', example: 'Admin@1234' } }, required: ['email', 'password'] } })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() body: LoginDto) {
    const tokens = await this.authService.login(body.email, body.password);
    return ok(tokens);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } })
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  async refresh(@Body() body: RefreshDto) {
    const tokens = await this.authService.refresh(body.refreshToken);
    return ok(tokens);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } })
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(RefreshSchema))
  async logout(@Body() body: RefreshDto) {
    await this.authService.logout(body.refreshToken);
    return ok(null);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: Express.User) {
    return ok(user);
  }
}
