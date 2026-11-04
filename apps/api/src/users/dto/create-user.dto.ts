import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  email!: string;
  password_hash!: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}
