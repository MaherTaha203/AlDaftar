// Categories module — types, repository seam, and application service.

export { CategoryStatus, type Category, type CategoryInput } from './category';
export {
  CategoryService,
  getCategoryRepository,
  getCategoryService,
  type CategoryRepository,
} from './category-service';
