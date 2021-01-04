import { Model, Document } from 'mongoose';

export enum ESaleStatus {
    COMPLETED = 'COMPLETED',
    PENDING = 'PENDING',
}

interface ISaleItem {
    _id: string;
    product: string;
    quantity: number;
}

export interface ISale {
    status: ESaleStatus;
    products?: ISaleItem[];
    subTotal?: number;
    discountPercent?: number;
    totalTax?: number;
    grandTotal?: number;
}

export type ISaleModel = Model<ISale & Document>;

// holds common reference for the return type for API
export interface IResponse {
    status: boolean;
    statusCode: number;
    data?: IGetSales[] | IGetSales | string;
    error?: {
        fieldName: string;
        message: string;
    }[];
}

export interface IGetSales {
    _id: string;
    status: ESaleStatus;
    products: ISaleItem[];
    subTotal: number;
    discountPercent: number;
    totalTax: number;
    grandTotal: number;
}
