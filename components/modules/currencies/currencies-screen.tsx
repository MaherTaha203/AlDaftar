'use client';

import { getCurrencyService, type Currency, type CurrencyInput } from '@/lib/modules/currencies';
import { MasterDataScreen } from '../shared/master-data-screen';

/** CurrenciesScreen — screen S-62: managed list with D-09 dialogs. */
export function CurrenciesScreen() {
  return (
    <MasterDataScreen<Currency, CurrencyInput>
      service={getCurrencyService()}
      texts={{
        createLabel: 'عملة جديدة',
        createTitle: 'عملة جديدة',
        editTitle: 'تعديل العملة',
        emptyMessage: 'لا توجد عملات بعد',
        searchPlaceholder: 'بحث بالاسم…',
        nameLabel: 'الاسم',
        archiveBody: 'سيُخفى العنصر من قوائم الاختيار ولن يُحذف أي سجل.',
      }}
      extraColumns={[
        {
          key: 'code',
          header: 'الرمز',
          render: (row) => (row.code === '' ? '—' : <bdi dir="ltr">{row.code}</bdi>),
        },
      ]}
      extraFields={[{ key: 'code', label: 'الرمز (مثل SAR)', ltr: true, maxLength: 8 }]}
      toInput={(name, extras) => ({ name, code: extras.code ?? '' })}
      fromRecord={(record) => ({ code: record.code })}
    />
  );
}
