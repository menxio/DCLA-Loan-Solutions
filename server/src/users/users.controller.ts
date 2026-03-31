import { Controller } from '@nestjs/common';
import { ROLE } from '../auth/roles.constants';
import { Roles } from '../auth/roles.decorator';

@Roles(ROLE.Admin)
@Controller('users')
export class UsersController {}
