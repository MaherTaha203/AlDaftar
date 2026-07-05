/**
 * Central Arabic UI copy for the shared component library
 * (03_UI_Specification.md §8: Arabic only, catalog kept outside components).
 * Components use these as defaults; screens may override via props.
 * Digit style for numbers is pending BDR-17; templates below are digit-neutral.
 */
export const uiText = {
  close: 'إغلاق',
  cancel: 'إلغاء',
  clear: 'مسح',
  search: 'بحث…',
  loading: 'جارٍ التحميل…',
  retry: 'إعادة المحاولة',
  requiredMark: '*',
  optional: 'اختياري',
  noData: 'لا توجد بيانات',
  noResults: 'لا توجد نتائج مطابقة',
  clearFilters: 'مسح عوامل التصفية',
  errorTitle: 'حدث خطأ',
  page: 'الصفحة',
  pageSize: 'عدد الصفوف',
  paginationOf: (from: string, to: string, total: string) => `عرض ${from}–${to} من ${total}`,
  previousPage: 'الصفحة السابقة',
  nextPage: 'الصفحة التالية',
  confirm: 'تأكيد',
  upload: {
    prompt: 'اسحب الملفات هنا أو انقر للاختيار',
    tooLarge: 'حجم الملف يتجاوز الحد المسموح',
    typeNotAllowed: 'نوع الملف غير مسموح',
    remove: 'إزالة',
    retry: 'إعادة الرفع',
    uploading: 'جارٍ الرفع…',
    done: 'تم الرفع',
    failed: 'فشل الرفع',
  },
  viewer: {
    download: 'تنزيل',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    rotate: 'تدوير',
    previous: 'السابق',
    next: 'التالي',
    unsupported: 'لا يمكن عرض هذا الملف هنا — يمكنك تنزيله',
  },
  table: {
    actions: 'إجراءات',
    sortedAscending: 'مرتب تصاعديًا',
    sortedDescending: 'مرتب تنازليًا',
  },
  print: {
    print: 'طباعة',
    back: 'رجوع',
    draftWatermark: 'مسودة',
    // Fixed internal-document note (05 §1): AlDaftar issues no invoices or
    // receipts — prints are internal records and vouchers.
    internalNote: 'مستند داخلي',
  },
  menu: 'القائمة',
} as const;
