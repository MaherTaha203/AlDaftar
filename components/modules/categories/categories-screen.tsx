'use client';

import { getCategoryService, type Category, type CategoryInput } from '@/lib/modules/categories';
import { MasterDataScreen } from '../shared/master-data-screen';

/** CategoriesScreen — screen S-60: managed list with D-09 dialogs. */
export function CategoriesScreen() {
  return (
    <MasterDataScreen<Category, CategoryInput>
      service={getCategoryService()}
      texts={{
        createLabel: 'تصنيف جديد',
        createTitle: 'تصنيف جديد',
        editTitle: 'تعديل التصنيف',
        emptyMessage: 'لا توجد تصنيفات بعد',
        searchPlaceholder: 'بحث بالاسم…',
        nameLabel: 'الاسم',
        archiveBody: 'سيُخفى التصنيف من قوائم الاختيار ولن يُحذف أي سجل.',
      }}
      extraFields={[{ key: 'notes', label: 'ملاحظات', multiline: true }]}
      toInput={(name, extras) => ({ name, notes: extras.notes ?? '' })}
      fromRecord={(record) => ({ notes: record.notes })}
    />
  );
}
