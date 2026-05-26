import type { Wholesaler } from '@/src/types/domain';
import type { WholesalerFormData } from '../schemas/wholesalerSchema';
import { DEFAULT_COMMISSION_RATE } from '../constants';

export function mapWholesalerToFormData(w: Wholesaler): Partial<WholesalerFormData> {
  return {
    id: w.id,
    companyName: w.companyName,
    categories: w.category ? w.category.split(',').map((c) => c.trim()).filter(Boolean) : [],
    status: w.status,
    ownerName: w.ownerName || '',
    mobile: w.mobile || '',
    email: w.email || '',
    logoUrl: w.logoUrl || '',
    commissionRate: w.commissionRate ?? DEFAULT_COMMISSION_RATE,
    addresses:
      w.addresses && w.addresses.length > 0
        ? w.addresses.map((a) => ({
            id: a.id,
            addressType: a.addressType,
            division: a.division || '',
            district: a.district,
            postalCode: a.postalCode,
            addressLine: a.addressLine,
            isDefault: a.isDefault,
          }))
        : [
            {
              addressType: 'primary',
              division: '',
              district: w.location || '',
              postalCode: '',
              addressLine: w.address || '',
              isDefault: true,
            },
          ],
    bankDetailsList:
      w.bankDetailsList && w.bankDetailsList.length > 0
        ? w.bankDetailsList.map((b) => ({
            id: b.id,
            bankName: b.bankName,
            accountName: b.accountName,
            accountNumber: b.accountNumber,
            branch: b.branch || '',
            routing: b.routing || '',
            isDefault: b.isDefault,
          }))
        : w.bankDetails?.bankName
          ? [
              {
                bankName: w.bankDetails.bankName,
                accountName: w.bankDetails.accountName,
                accountNumber: w.bankDetails.accountNumber,
                branch: w.bankDetails.branch || '',
                routing: w.bankDetails.routing || '',
                isDefault: true,
              },
            ]
          : [],
    digitalWallets:
      w.digitalWallets && w.digitalWallets.length > 0
        ? w.digitalWallets.map((wallet) => ({
            id: wallet.id,
            walletType: wallet.walletType,
            accountNumber: wallet.accountNumber,
            isDefault: wallet.isDefault,
          }))
        : w.digitalWallet?.accountNumber
          ? [
              {
                walletType: w.digitalWallet.walletType as 'bkash' | 'nagad' | 'rocket' | 'upay',
                accountNumber: w.digitalWallet.accountNumber,
                isDefault: true,
              },
            ]
          : [],
    documents: (w.documents || []).map((d) => ({
      name: d.name,
      date: d.date,
      status: d.status,
      fileUrl: d.fileUrl,
    })),
  };
}
