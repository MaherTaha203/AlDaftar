// Products module — types, repository seam, and application service.

export { ProductStatus, type Product, type ProductInput } from './product';
export {
  ProductService,
  getProductRepository,
  getProductService,
  type ProductRepository,
} from './product-service';
