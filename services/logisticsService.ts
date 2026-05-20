// import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, getDocFromServer } from 'firebase/firestore';
// import { ShippingRate } from '../types';

// const RATES_COLLECTION = 'shippingRates';

// enum OperationType {
//   CREATE = 'create',
//   UPDATE = 'update',
//   DELETE = 'delete',
//   LIST = 'list',
//   GET = 'get',
//   WRITE = 'write',
// }

// // interface FirestoreErrorInfo {
// //   error: string;
// //   operationType: OperationType;
// //   path: string | null;
// //   authInfo: {
// //     userId: string | undefined;
// //     email: string | null | undefined;
// //     emailVerified: boolean | undefined;
// //     isAnonymous: boolean | undefined;
// //     tenantId: string | null | undefined;
// //     providerInfo: {
// //       providerId: string;
// //       displayName: string | null;
// //       email: string | null;
// //       photoUrl: string | null;
// //     }[];
// //   }
// // }

// // function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
// //   const errInfo: FirestoreErrorInfo = {
// //     error: error instanceof Error ? error.message : String(error),
// //     authInfo: {
// //       userId: auth.currentUser?.uid,
// //       email: auth.currentUser?.email,
// //       emailVerified: auth.currentUser?.emailVerified,
// //       isAnonymous: auth.currentUser?.isAnonymous,
// //       tenantId: auth.currentUser?.tenantId,
// //       providerInfo: auth.currentUser?.providerData.map(provider => ({
// //         providerId: provider.providerId,
// //         displayName: provider.displayName,
// //         email: provider.email,
// //         photoUrl: provider.photoURL
// //       })) || []
// //     },
// //     operationType,
// //     path
// //   }
// //   console.error('Firestore Error: ', JSON.stringify(errInfo));
// //   throw new Error(JSON.stringify(errInfo));
// // }

// export const logisticsService = {
//   async testConnection() {
//     try {
//       await getDocFromServer(doc(db, 'test', 'connection'));
//     } catch (error) {
//       if(error instanceof Error && error.message.includes('the client is offline')) {
//         console.error("Please check your Firebase configuration. ");
//       }
//     }
//   },

//   async getShippingRates(): Promise<ShippingRate[]> {
//     try {
//       const q = query(collection(db, RATES_COLLECTION), orderBy('maxWeight', 'asc'));
//       const snapshot = await getDocs(q);
//       return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShippingRate));
//     } catch (error) {
//       handleFirestoreError(error, OperationType.LIST, RATES_COLLECTION);
//       return [];
//     }
//   },

//   async saveShippingRate(rate: Omit<ShippingRate, 'id'> & { id?: string }) {
//     try {
//       if (rate.id && !rate.id.startsWith('temp-')) {
//         const docRef = doc(db, RATES_COLLECTION, rate.id);
//         await updateDoc(docRef, { ...rate, updatedAt: new Date().toISOString() });
//       } else {
//         const rateData = { ...rate };
//         delete rateData.id;
//         await addDoc(collection(db, RATES_COLLECTION), { ...rateData, updatedAt: new Date().toISOString() });
//       }
//     } catch (error) {
//       handleFirestoreError(error, OperationType.WRITE, RATES_COLLECTION);
//     }
//   },

//   extractWeightFromDescription(description: string): number {
//     if (!description) return 0;
    
//     // Look for patterns like "5kg", "5 kg", "500g", "500 g"
//     const kgRegex = /(\d+(?:\.\d+)?)\s*kg/i;
//     const gRegex = /(\d+(?:\.\d+)?)\s*g\b/i;

//     const kgMatch = description.match(kgRegex);
//     if (kgMatch) return parseFloat(kgMatch[1]);

//     const gMatch = description.match(gRegex);
//     if (gMatch) return parseFloat(gMatch[1]) / 1000;

//     return 0;
//   },

//   async calculateShippingPrice(totalWeight: number): Promise<number> {
//     try {
//       const rates = await this.getShippingRates();
//       if (rates.length === 0) return 150; // Default fallback

//       // Find the first rate where maxWeight >= totalWeight
//       const applicableRate = rates.find(r => r.maxWeight >= totalWeight);
      
//       if (applicableRate) {
//         return applicableRate.price;
//       }

//       return rates[rates.length - 1].price;
//     } catch {
//       return 150;
//     }
//   },

//   async initializeDefaultRates() {
//     if (!auth.currentUser) {
//       console.warn('Cannot initialize rates: User not authenticated');
//       return;
//     }

//     try {
//       const existing = await this.getShippingRates();
//       if (existing.length > 0) return;

//       const defaultRates = [
//         { maxWeight: 5, price: 210 },
//         { maxWeight: 10, price: 310 },
//         { maxWeight: 15, price: 410 },
//         { maxWeight: 20, price: 510 },
//         { maxWeight: 25, price: 610 },
//         { maxWeight: 30, price: 710 },
//         { maxWeight: 35, price: 810 },
//         { maxWeight: 40, price: 910 },
//         { maxWeight: 50, price: 1110 },
//       ];

//       for (const rate of defaultRates) {
//         await this.saveShippingRate(rate);
//       }
//     } catch (error) {
//       console.error('Error in initializeDefaultRates:', error);
//     }
//   }
// };
