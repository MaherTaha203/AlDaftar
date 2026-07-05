// Business Framework — shared infrastructure for all business modules
// (Phase 6.5). Layering: framework may import lib/core and components/{ui,
// layout,app}; components/ui stays lib-free; modules import framework.

export { getErrorMessage } from './error-messages';
export { useOperation, type OperationState } from './use-operation';
export { useDirtyGuard } from './use-dirty-guard';
export { ListPage, type ListPageProps, type ListPageSearch } from './list-page';
export { FormPage, type FormPageProps } from './form-page';
export { EntityPicker, type EntityOption, type EntityPickerProps } from './entity-picker';
