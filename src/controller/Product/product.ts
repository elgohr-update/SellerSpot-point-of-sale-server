import lodash, { isNull } from 'lodash';
import { joiSchemaOptions } from 'utilities';
import { getProductModel } from 'utilities/modelService';
import { STATUS_CODES, pointOfSaleTypes } from '@sellerspot/universal-types';
import {
    createProductValidationSchema,
    deleteProductValidationSchema,
    getSingleProductValidationSchema,
    searchProductValidationSchema,
    updateProductValidationSchema,
} from './product.validation';

/**
 * Used to get all products from database
 */
export const getProducts = async (
    tenantId: string,
): Promise<pointOfSaleTypes.productResponseTypes.IGetAllProducts> => {
    try {
        const tenantDb = global.currentDb.useDb(tenantId);
        const ProductModel = getProductModel(tenantDb);
        const data = <pointOfSaleTypes.productResponseTypes.IGetProducts['data']>(
            // change types on tenantDb model (database-models), populated values should have optional types eg:- catergory: string | ICategory (remove comment after fixing that)
            (<unknown>await ProductModel.find()
                .populate('brand')
                .populate('category')
                .populate({
                    path: 'stockInformation',
                    populate: {
                        path: 'stockUnit',
                    },
                })
                .populate('taxBracket'))
        );
        return Promise.resolve({
            status: true,
            statusCode: STATUS_CODES.OK,
            data,
        });
    } catch (error) {
        return Promise.reject({
            status: false,
            statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR,
            error: error.message,
        });
    }
};

/**
 * Used to get a single product from database
 */
export const getSingleProduct = async (
    productData: pointOfSaleTypes.productRequestTypes.IGetSingleProduct,
    tenantId: string,
): Promise<pointOfSaleTypes.productResponseTypes.IGetProduct> => {
    try {
        // getting instance of database modal
        const tenantDb = global.currentDb.useDb(tenantId);
        const ProductModel = getProductModel(tenantDb);
        // validating input data
        const { error } = getSingleProductValidationSchema.validate(productData, joiSchemaOptions);
        if (!error) {
            const requestedData = <pointOfSaleTypes.productResponseTypes.IGetProduct['data']>(
                (<unknown>await ProductModel.findById(productData.id)
                    .populate('brand')
                    .populate('category')
                    .populate({
                        path: 'stockInformation',
                        populate: {
                            path: 'stockUnit',
                        },
                    })
                    .populate('taxBracket'))
            );
            if (!lodash.isNull(requestedData)) {
                return Promise.resolve({
                    status: true,
                    statusCode: STATUS_CODES.OK,
                    data: requestedData,
                });
            } else {
                throw {
                    status: false,
                    statusCode: STATUS_CODES.NO_CONTENT,
                    error: 'Requested data not found in database',
                };
            }
        } else {
            throw {
                status: false,
                statusCode: STATUS_CODES.BAD_REQUEST,
                error: 'Please verify request parameters',
            };
        }
    } catch (error) {
        return Promise.reject(error);
    }
};

/**
 * Used to create a new product in database
 * @param productData Data to be added to database
 */
export const createProduct = async (
    productData: pointOfSaleTypes.productRequestTypes.ICreateProduct,
    tenantId: string,
): Promise<pointOfSaleTypes.productResponseTypes.ICreateProduct> => {
    try {
        // validating input data
        const { error } = createProductValidationSchema.validate(productData, joiSchemaOptions);
        if (!error) {
            // getting instance of database modal
            const tenantDb = global.currentDb.useDb(tenantId);
            const ProductModel = getProductModel(tenantDb);
            const productToAdd = await ProductModel.find({ name: productData.name });
            const data = <pointOfSaleTypes.productResponseTypes.ICreateProduct['data']>(
                (<unknown>await ProductModel.create(<never>productData))
            ); // fix this @RohitRajP
            if (productToAdd.length === 0) {
                return Promise.resolve({
                    status: true,
                    statusCode: STATUS_CODES.CREATED,
                    data,
                });
            } else {
                throw {
                    status: false,
                    statusCode: STATUS_CODES.CONFLICT,
                    error: [
                        {
                            name: 'name',
                            message: 'A product with this name already exists in database',
                        },
                    ],
                };
            }
        } else {
            throw {
                status: false,
                statusCode: STATUS_CODES.BAD_REQUEST,
                error: error.details.map((fieldError) => {
                    return {
                        name: fieldError.context
                            .label as pointOfSaleTypes.productResponseTypes.fieldNames,
                        message: fieldError.message,
                    };
                }),
            };
        }
    } catch (error) {
        return Promise.reject(error);
    }
};

/**
 * Used to update product data in database
 */
export const updateProduct = async (
    updateData: pointOfSaleTypes.productRequestTypes.IUpdateProduct,
    tenantId: string,
): Promise<pointOfSaleTypes.productResponseTypes.IUpdateProduct> => {
    try {
        // getting instance of database modal
        const tenantDb = global.currentDb.useDb(tenantId);
        const ProductModel = getProductModel(tenantDb);
        // validating request data
        const { error } = updateProductValidationSchema.validate(updateData, joiSchemaOptions);
        if (!error) {
            // checking if a product with the given id exists in database
            const existingProduct = await ProductModel.findById(updateData.id);
            if (!lodash.isNull(existingProduct)) {
                // checking if a product with the same name already exists
                const existingProductName = await ProductModel.findOne({
                    name: updateData.productData.name,
                });
                const data = <pointOfSaleTypes.productResponseTypes.IUpdateProduct['data']>(
                    (<unknown>await ProductModel.findByIdAndUpdate(
                        updateData.id,
                        <unknown>updateData.productData, // fix this @RohitRajP
                        {
                            new: true,
                        },
                    ))
                );
                if (lodash.isNull(existingProductName)) {
                    return Promise.resolve({
                        status: true,
                        statusCode: STATUS_CODES.OK,
                        data,
                    });
                } else {
                    throw {
                        status: false,
                        statusCode: STATUS_CODES.CONFLICT,
                        error: [
                            {
                                name: 'name',
                                message: 'This product name is already present in database',
                            },
                        ],
                    };
                }
            } else {
                throw {
                    status: false,
                    statusCode: STATUS_CODES.NO_CONTENT,
                    error: [
                        {
                            name: 'id',
                            message: 'No product exists for the given ID',
                        },
                    ],
                };
            }
        } else {
            throw {
                status: false,
                statusCode: STATUS_CODES.BAD_REQUEST,
                error: error.details.map((fieldError) => {
                    return {
                        name: fieldError.context
                            .label as pointOfSaleTypes.productResponseTypes.fieldNames,
                        message: fieldError.message,
                    };
                }),
            };
        }
    } catch (error) {
        return Promise.reject(error);
    }
};

/**
 * Used to delete a product from database
 */
export const deleteProduct = async (
    productData: pointOfSaleTypes.productRequestTypes.IDeleteProduct,
    tenantId: string,
): Promise<pointOfSaleTypes.productResponseTypes.IDeleteProduct> => {
    try {
        // getting instance of database modal
        const tenantDb = global.currentDb.useDb(tenantId);
        const ProductModel = getProductModel(tenantDb);
        // validating the request data
        const { error } = deleteProductValidationSchema.validate(productData, joiSchemaOptions);
        if (!error) {
            // checking if the product to delete exists in database
            const existingProduct = await ProductModel.findById(productData.id);
            if (!lodash.isNull(existingProduct)) {
                const data = <
                    pointOfSaleTypes.productResponseTypes.IDeleteProduct['data'] // fix @RohitRajP
                >(<unknown>await ProductModel.findByIdAndDelete(productData.id));
                return Promise.resolve({
                    status: true,
                    statusCode: STATUS_CODES.OK,
                    data,
                });
            } else {
                throw {
                    status: false,
                    statusCode: STATUS_CODES.NO_CONTENT,
                    error: 'Requested data not found in database',
                };
            }
        } else {
            throw {
                status: false,
                statusCode: STATUS_CODES.BAD_REQUEST,
                error: 'Please verify request parameters',
            };
        }
    } catch (error) {
        return Promise.reject(error);
    }
};

/**
 * Used to search for products with query string
 */
export const searchProducts = async (
    data: pointOfSaleTypes.productRequestTypes.ISearchProduct,
    tenantId: string,
): Promise<pointOfSaleTypes.productResponseTypes.ISearchProduct> => {
    try {
        // getting instance of database modal
        const tenantDb = global.currentDb.useDb(tenantId);
        const ProductModel = getProductModel(tenantDb);
        // validating the request data
        const { error } = searchProductValidationSchema.validate(data, joiSchemaOptions);
        if (!error) {
            // searching for the query matching the barcode
            let existingProduct = await ProductModel.find({
                gtinNumber: data.query,
            })
                .populate('brand')
                .populate('category')
                .populate({
                    path: 'stockInformation',
                    populate: {
                        path: 'stockUnit',
                    },
                })
                .populate('taxBracket');
            if (existingProduct.length > 0) {
                const data = <pointOfSaleTypes.productResponseTypes.ISearchProduct['data']>(<
                    unknown
                >{
                    queryType: 'barcode',
                    results: existingProduct,
                });
                return Promise.resolve({
                    status: true,
                    statusCode: STATUS_CODES.OK,
                    data,
                });
            } else {
                existingProduct = await ProductModel.find({
                    name: new RegExp('^' + data.query, 'gi'),
                })
                    .populate('brand')
                    .populate('category')
                    .populate({
                        path: 'stockInformation',
                        populate: {
                            path: 'stockUnit',
                        },
                    })
                    .populate('taxBracket');
                if (existingProduct.length > 0) {
                    const data = <pointOfSaleTypes.productResponseTypes.ISearchProduct['data']>(<
                        // fix @RohitRajP
                        unknown
                    >{
                        queryType: 'name',
                        results: existingProduct,
                    });
                    return Promise.resolve({
                        status: true,
                        statusCode: STATUS_CODES.OK,
                        data,
                    });
                } else {
                    throw {
                        status: false,
                        statusCode: STATUS_CODES.NO_CONTENT,
                        data: null,
                    };
                }
            }
        }
    } catch (error) {
        return Promise.reject(error);
    }
    return null;
};
