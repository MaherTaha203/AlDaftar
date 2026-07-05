'use client';

import { getUnitService, type Unit, type UnitInput } from '@/lib/modules/units';
import { MasterDataScreen } from '../shared/master-data-screen';

/** UnitsScreen — screen S-61: managed list with D-09 dialogs. */
export function UnitsScreen() {
  return (
    <MasterDataScreen<Unit, UnitInput>
      service={getUnitService()}
      texts={{
        createLabel: 'وحدة جديدة',
        createTitle: 'وحدة جديدة',
        editTitle: 'تعديل الوحدة',
        emptyMessage: 'لا توجد وحدات بعد',
        searchPlaceholder: 'بحث بالاسم…',
        nameLabel: 'الاسم',
        archiveBody: 'سيُخفى العنصر من قوائم الاختيار ولن يُحذف أي سجل.',
      }}
      extraFields={[{ key: 'notes', label: 'ملاحظات', multiline: true }]}
      toInput={(name, extras) => ({ name, notes: extras.notes ?? '' })}
      fromRecord={(record) => ({ notes: record.notes })}
    />
  );
}
