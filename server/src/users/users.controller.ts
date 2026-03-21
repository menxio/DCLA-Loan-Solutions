import { Controller } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';

@Roles('admin')
@Controller('users')
export class UsersController {}
