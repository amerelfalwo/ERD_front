import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import {
  Wallet, FileText, Star, Plus, Trash2, Filter, AlertTriangle,
  ChevronLeft, ChevronRight, RefreshCw, X, Tag, Calendar, DollarSign
} from 'lucide-react';

import {
  getExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary
} from '../../services/expenseService';

const CATEGORY_COLORS = {
  marketing: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  rent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  salaries: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  maintenance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  others: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
};

export default function ExpensesView() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total_expenses: 0, expenses_count: 0, top_category: null });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState('marketing');

  // Quick Period Filters
  const [activeFilter, setActiveFilter] = useState('all'); // all | today | week | month | year | custom
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const applyPeriodFilter = (type) => {
    setActiveFilter(type);
    const today = new Date();

    if (type === 'all') {
      setDateFrom('');
      setDateTo('');
      setShowCustomRange(false);
    } else if (type === 'today') {
      const formatted = format(today, 'yyyy-MM-dd');
      setDateFrom(formatted);
      setDateTo(formatted);
      setShowCustomRange(false);
    } else if (type === 'week') {
      setDateFrom(format(startOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd'));
      setDateTo(format(endOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'month') {
      setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'year') {
      setDateFrom(format(startOfYear(today), 'yyyy-MM-dd'));
      setDateTo(format(endOfYear(today), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'custom') {
      setShowCustomRange(true);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, summaryData] = await Promise.all([
        getExpenses({ date_from: dateFrom, date_to: dateTo }),
        getExpenseSummary({ date_from: dateFrom, date_to: dateTo })
      ]);
      setExpenses(Array.isArray(listData) ? listData : []);
      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Failed to fetch expenses data', error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    document.title = `${t('common.erbSystem', 'ERB_SYSTEM')} | ${t('expenses.title', 'المصروفات')}`;
  }, [t]);


  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || !expenseDate) return;

    try {
      const newExpense = await createExpense({
        description: description.trim(),
        amount: parseFloat(amount),
        expense_date: expenseDate,
        category: category || null
      });

      // Update state directly
      if (newExpense && newExpense.id) {
        setExpenses((prev) => [newExpense, ...prev]);
      }
      setShowModal(false);
      setDescription('');
      setAmount('');
      setCategory('marketing');
      setExpenseDate(format(new Date(), 'yyyy-MM-dd'));

      // Refresh summary cards
      const updatedSummary = await getExpenseSummary({ date_from: dateFrom, date_to: dateTo });
      if (updatedSummary) setSummary(updatedSummary);
    } catch (error) {
      console.error('Failed to create expense', error);
      alert(t('expenses.create_error', 'حدث خطأ أثناء إضافة المصروف'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteExpense(deleteTargetId);
      setExpenses((prev) => prev.filter((item) => item.id !== deleteTargetId));
      setDeleteTargetId(null);

      // Refresh summary cards
      const updatedSummary = await getExpenseSummary({ date_from: dateFrom, date_to: dateTo });
      if (updatedSummary) setSummary(updatedSummary);
    } catch (error) {
      console.error('Failed to delete expense', error);
    }
  };

  // Category Badge Render Helper
  const renderCategoryBadge = (catKey) => {
    if (!catKey) {
      return (
        <span className="px-2.5 py-1 rounded-full text-label-sm font-medium bg-gray-500/10 text-muted-steel border border-outline-variant/40">
          {t('expenses.uncategorized', 'بدون تصنيف')}
        </span>
      );
    }
    const colorClass = CATEGORY_COLORS[catKey.toLowerCase()] || 'bg-accent/10 text-accent border-accent/20';
    const labelText = t(`expenses.categories.${catKey.toLowerCase()}`, catKey);

    return (
      <span className={`px-2.5 py-1 rounded-full text-label-sm font-semibold border ${colorClass}`}>
        {labelText}
      </span>
    );
  };

  // Pagination Logic
  const totalPages = Math.ceil(expenses.length / pageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return expenses.slice(start, start + pageSize);
  }, [expenses, currentPage, pageSize]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── Header & Action Button ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-charcoal-ink font-extrabold tracking-tight">
            {t('expenses.title', 'مصروفات البراند')}
          </h1>
          <p className="text-body-base text-muted-steel mt-1">
            إدارة وتتبع المصروفات التشغيلية للبراند في مكان واحد
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-on-primary rounded-xl text-label-md font-bold hover:bg-accent-hover transition-all shadow-sm cursor-pointer self-start md:self-auto"
        >
          <Plus size={18} strokeWidth={2.5} />
          {t('expenses.add_expense', 'إضافة مصروف')}
        </button>
      </div>

      {/* ── Summary Cards Header ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Expenses Card */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper flex justify-between items-start">
          <div>
            <span className="text-label-sm text-muted-steel uppercase tracking-wider font-medium">
              {t('expenses.total_expenses', 'إجمالي المصروفات')}
            </span>
            <div className="text-h2 font-mono-tabular text-rose-600 dark:text-rose-400 font-bold mt-2">
              EGP {Number(summary.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-sm">
            <Wallet size={22} strokeWidth={1.8} />
          </div>
        </div>

        {/* Expenses Count Card */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper flex justify-between items-start">
          <div>
            <span className="text-label-sm text-muted-steel uppercase tracking-wider font-medium">
              {t('expenses.expenses_count', 'عدد المصروفات المسجلة')}
            </span>
            <div className="text-h2 font-mono-tabular text-charcoal-ink font-bold mt-2">
              {summary.expenses_count || 0}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm">
            <FileText size={22} strokeWidth={1.8} />
          </div>
        </div>

        {/* Top Category Card (Rendered only if top_category exists) */}
        {summary.top_category && (
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper flex justify-between items-start">
            <div>
              <span className="text-label-sm text-muted-steel uppercase tracking-wider font-medium">
                {t('expenses.top_category', 'أكبر تصنيف مصروفات')}
              </span>
              <div className="mt-2">
                {renderCategoryBadge(summary.top_category)}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm">
              <Star size={22} strokeWidth={1.8} />
            </div>
          </div>
        )}
      </div>

      {/* ── Date Filters ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-whisper flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-accent" />
          <span className="text-label-md font-semibold text-charcoal-ink">تصفية التواريخ:</span>
        </div>

        <div className="bg-surface-container-high p-1 rounded-xl flex flex-wrap items-center gap-1 border border-outline-variant/60 shadow-whisper">
          <button
            onClick={() => applyPeriodFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
              activeFilter === 'all' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => applyPeriodFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
              activeFilter === 'today' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('dashboard.today', 'اليوم')}
          </button>
          <button
            onClick={() => applyPeriodFilter('week')}
            className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
              activeFilter === 'week' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('dashboard.week', 'الأسبوع')}
          </button>
          <button
            onClick={() => applyPeriodFilter('month')}
            className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
              activeFilter === 'month' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('dashboard.month', 'الشهر')}
          </button>
          <button
            onClick={() => applyPeriodFilter('year')}
            className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
              activeFilter === 'year' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('dashboard.year', 'السنة')}
          </button>
          <button
            onClick={() => applyPeriodFilter('custom')}
            className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
              activeFilter === 'custom' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t('dashboard.custom', 'فترة مخصصة')}
          </button>
        </div>
      </div>

      {/* Custom Range Date Pickers */}
      {showCustomRange && (
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 flex flex-wrap items-center gap-4 animate-fade-in shadow-whisper">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-label-md text-charcoal-ink"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-label-md text-charcoal-ink"
            />
          </div>
        </div>
      )}

      {/* ── Table / Empty State ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-steel flex items-center justify-center gap-2">
            <RefreshCw size={20} className="animate-spin text-accent" />
            <span>جاري تحميل المصروفات...</span>
          </div>
        ) : expenses.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-muted-steel mb-4 shadow-sm">
              <Wallet size={32} strokeWidth={1.2} />
            </div>
            <h3 className="text-h3 font-bold text-charcoal-ink mb-1">
              {t('expenses.no_expenses', 'لا توجد مصروفات مسجلة في هذه الفترة')}
            </h3>
            <p className="text-body-base text-muted-steel max-w-sm mb-6">
              {t('expenses.no_expenses_sub', 'ابدأ بتسجيل مصروف جديد باستخدام الزر أعلاه.')}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-on-primary rounded-xl text-label-md font-bold hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
            >
              <Plus size={18} strokeWidth={2.5} />
              {t('expenses.add_expense', 'إضافة مصروف')}
            </button>
          </div>
        ) : (
          /* Enhanced Table */
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/50 text-label-sm text-muted-steel uppercase tracking-wider">
                  <th className="p-4 text-right">{t('expenses.date', 'التاريخ')}</th>
                  <th className="p-4 text-right">{t('expenses.description', 'الوصف')}</th>
                  <th className="p-4 text-center">{t('expenses.category', 'التصنيف')}</th>
                  <th className="p-4 text-left">{t('expenses.amount', 'المبلغ')}</th>
                  <th className="p-4 text-center">{t('expenses.actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-body-sm">
                {paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="p-4 font-mono-tabular text-charcoal-ink font-medium">{expense.expense_date}</td>
                    <td className="p-4 font-semibold text-charcoal-ink">{expense.description}</td>
                    <td className="p-4 text-center">{renderCategoryBadge(expense.category)}</td>
                    <td className="p-4 font-bold font-mono-tabular text-rose-600 dark:text-rose-400 text-left">
                      EGP {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setDeleteTargetId(expense.id)}
                        title="حذف المصروف"
                        className="p-2 rounded-xl text-error hover:bg-error/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={18} strokeWidth={1.8} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-outline-variant/40 flex justify-between items-center bg-surface-container-low">
                <span className="text-label-sm text-muted-steel">
                  عرض الصفحة {currentPage} من {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-xl border border-outline-variant/60 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                  >
                    {isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl border border-outline-variant/60 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                  >
                    {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Expense Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-charcoal-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 shadow-whisper-lg w-full max-w-md space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-h2 font-bold text-charcoal-ink">{t('expenses.add_expense', 'إضافة مصروف')}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-muted-steel hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-label-sm font-semibold text-charcoal-ink mb-1">
                  {t('expenses.description', 'الوصف')} <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الحملة الإعلانية لشهر أغسطس"
                  className="w-full bg-surface-container-high border border-outline-variant/60 p-3 rounded-xl text-body-sm text-charcoal-ink focus:ring-2 focus:ring-accent outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-charcoal-ink mb-1">
                  {t('expenses.amount', 'المبلغ (EGP)')} <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full bg-surface-container-high border border-outline-variant/60 p-3 rounded-xl text-body-sm text-charcoal-ink font-mono-tabular focus:ring-2 focus:ring-accent outline-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-charcoal-ink mb-1">
                  {t('expenses.category', 'التصنيف')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/60 p-3 rounded-xl text-body-sm text-charcoal-ink focus:ring-2 focus:ring-accent outline-none cursor-pointer"
                >
                  <option value="marketing">{t('expenses.categories.marketing', 'تسويق')}</option>
                  <option value="rent">{t('expenses.categories.rent', 'إيجار')}</option>
                  <option value="salaries">{t('expenses.categories.salaries', 'رواتب')}</option>
                  <option value="maintenance">{t('expenses.categories.maintenance', 'صيانة')}</option>
                  <option value="others">{t('expenses.categories.others', 'أخرى')}</option>
                </select>
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-charcoal-ink mb-1">
                  {t('expenses.date', 'التاريخ')} <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full bg-surface-container-high border border-outline-variant/60 p-3 rounded-xl text-body-sm text-charcoal-ink focus:ring-2 focus:ring-accent outline-none"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-label-md text-muted-steel hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer"
                >
                  {t('expenses.cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-accent text-on-primary font-bold rounded-xl hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
                >
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Delete Confirmation Modal ── */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-charcoal-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 shadow-whisper-lg w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-h3 font-bold text-charcoal-ink">{t('expenses.delete_confirm_title', 'تأكيد حذف المصروف')}</h3>
              <p className="text-body-sm text-muted-steel mt-1">
                {t('expenses.delete_confirm_msg', 'هل أنت متأكد من رغبتك في حذف هذا المصروف؟ لا يمكن التراجع عن هذه الخطوة.')}
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 text-label-md text-muted-steel hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer"
              >
                {t('expenses.cancel', 'إلغاء')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all shadow-sm cursor-pointer"
              >
                {t('expenses.delete', 'حذف المصروف')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
