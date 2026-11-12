import type { Event } from '@/lib/api';

export const MAX_TICKETS = 4;
export const SECTIONS = ['A', 'B', 'C'];

export interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  perks: string[];
}

export function buildTiers(event: Event): TicketTier[] {
  if ((event.price_min ?? 0) <= 0 && (event.price_max ?? 0) <= 0) {
    return [
      {
        id: 'gratis',
        name: 'Registrasi gratis',
        description: 'Konfirmasi kehadiran tanpa biaya tiket.',
        price: 0,
        perks: ['Akses ke area acara', 'Konfirmasi kehadiran digital'],
      },
    ];
  }
  if ((event.price_max ?? 0) <= (event.price_min ?? 0)) {
    return [
      {
        id: 'reguler',
        name: 'Tiket reguler',
        description: 'Satu harga untuk seluruh area acara.',
        price: event.price_min,
        perks: ['Akses area acara', 'E-tiket dengan kode pemesanan'],
      },
    ];
  }
  if (event.type !== 'concert') {
    return [
      {
        id: 'reguler',
        name: 'Tiket reguler',
        description: 'Akses area acara dengan harga dasar.',
        price: event.price_min,
        perks: ['Akses area acara', 'E-tiket dengan kode pemesanan'],
      },
      {
        id: 'utama',
        name: 'Tiket utama',
        description: 'Akses area acara dengan harga dukungan lebih tinggi.',
        price: event.price_max,
        perks: ['Akses area acara', 'E-tiket dengan kode pemesanan'],
      },
    ];
  }
  return [
    {
      id: 'cat-1',
      name: 'CAT 1',
      description: 'Area paling dekat dengan panggung.',
      price: event.price_max,
      perks: ['E-tiket dengan kode pemesanan'],
    },
    {
      id: 'cat-2',
      name: 'CAT 2',
      description: 'Area tengah dengan pandangan luas.',
      price: event.price_min,
      perks: ['E-tiket dengan kode pemesanan'],
    },
  ];
}
