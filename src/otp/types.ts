export interface OtpRecord {
  code: string;
  expiresAt: number;
}

export interface SendOtpBody {
  phone: string;
}

export interface VerifyOtpBody {
  phone: string;
  code: string;
}
