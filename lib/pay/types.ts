

export interface PaymentOption {
  invoice_uid: string;
  currency: string;
  address: string;
  amount: number;
  protocol?: string;
  createdAt?: Date;
}

export interface VerifyPayment {
  payment_option: PaymentOption;
  hex: string;
  protocol: string; // BIP70, BIP270, JSONV2
}

export interface PaymentOutput {
  amount: number;
  script: string;
}

