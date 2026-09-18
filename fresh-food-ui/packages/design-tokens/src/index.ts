export const colors = {
  primary: '#1F4D46',
  primaryDark: '#0F2E29',
  primaryTint: '#E4ECE9',
  accent: '#E5623E',
  accentTint: '#FBE7DF',
  background: '#F6F2EA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEAE0',
  text: '#17211E',
  textMuted: '#5C6B66',
  textSoft: '#8B968F',
  border: '#E3DDCF',
  success: '#2E7D5B',
  successTint: '#E3F1E9',
  warning: '#B9791F',
  warningTint: '#FBEEDC',
  error: '#BE4436',
  errorTint: '#FBE7E3'
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999
} as const;

export const spacing = { xs: 4, sm: 8, md: 14, lg: 22, xl: 32 } as const;

export type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod';

export type Order = {
  id: string;
  customer: string;
  items: string;
  amount: number;
  status: OrderStatus;
  payment: PaymentMethod;
  zone: string;
};

export const orders: Order[] = [
  { id: 'FF10284', customer: 'Thashreef R.', items: 'Seer Fish + 2', amount: 1361, status: 'out_for_delivery', payment: 'cod', zone: 'Zone 1' },
  { id: 'FF10283', customer: 'Meera S.', items: 'Mutton Curry Cut', amount: 890, status: 'preparing', payment: 'cod', zone: 'Zone 2' },
  { id: 'FF10282', customer: 'Nikhil V.', items: 'Family Meat Pack', amount: 999, status: 'pending', payment: 'cod', zone: 'Zone 2' }
];
