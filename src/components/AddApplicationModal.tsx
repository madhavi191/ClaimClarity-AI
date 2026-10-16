import React, { useState } from 'react';
import { LoanApplication, DocumentStatus, DocumentItem } from '../types';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { createTestApplication, editTestApplication } from '../api';

interface AddApplicationModalProps {
  token: string;
  isOpen: boolean;
  editApp: LoanApplication | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  token,
  isOpen,
  editApp,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  // Form states
  const [name, setName] = useState(editApp?.customer.name || '');
  const [age, setAge] = useState(editApp?.customer.age || 32);
  const [employer, setEmployer] = useState(editApp?.customer.employer || '');
  const [city, setCity] = useState(editApp?.customer.city || '');
  const [employment, setEmployment] = useState(editApp?.customer.employment || 'Salaried');

  const [loanType, setLoanType] = useState(editApp?.loan.type || 'Personal Loan');
  const [amount, setAmount] = useState(editApp?.loan.amount || 500000);
  const [tenureMonths, setTenureMonths] = useState(editApp?.loan.tenureMonths || 36);
  const [purpose, setPurpose] = useState(editApp?.loan.purpose || 'Debt Consolidation');

  const [declaredIncome, setDeclaredIncome] = useState(editApp?.declaredMonthlyIncome || 60000);
  const [salaryCredits, setSalaryCredits] = useState<number[]>(
    editApp?.salaryCredits || [55000, 56000, 54500]
  );

  const [documents, setDocuments] = useState<DocumentItem[]>(
    editApp?.documents || [
      { name: 'PAN', status: 'Verified' },
      { name: 'Aadhaar', status: 'Verified' },
      { name: 'Salary Slip', status: 'Verified' },
      { name: 'Bank Statement', status: 'Verified' },
    ]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCredit = () => {
    setSalaryCredits([...salaryCredits, Math.round(declaredIncome * 0.9)]);
  };

  const handleRemoveCredit = (index: number) => {
    if (salaryCredits.length <= 1) return;
    setSalaryCredits(salaryCredits.filter((_, i) => i !== index));
  };

  const handleUpdateCredit = (index: number, val: number) => {
    const updated = [...salaryCredits];
    updated[index] = val;
    setSalaryCredits(updated);
  };

  const handleUpdateDocStatus = (index: number, status: DocumentStatus) => {
    const updated = [...documents];
    updated[index].status = status;
    setDocuments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Frontend validation
    if (!name.trim() || !employer.trim() || !city.trim() || !purpose.trim()) {
      setError('Please fill in all required text fields.');
      setLoading(false);
      return;
    }

    if (declaredIncome <= 0 || amount <= 0 || tenureMonths <= 0) {
      setError('Income, loan amount, and tenure must be positive numbers.');
      setLoading(false);
      return;
    }

    if (salaryCredits.some((c) => c < 0 || !Number.isFinite(c))) {
      setError('All salary credits must be non-negative valid numbers.');
      setLoading(false);
      return;
    }

    try {
      const payload: Partial<LoanApplication> = {
        customer: {
          name: name.trim(),
          age: Number(age),
          employer: employer.trim(),
          city: city.trim(),
          employment: employment.trim(),
        },
        loan: {
          type: loanType.trim(),
          amount: Number(amount),
          tenureMonths: Number(tenureMonths),
          purpose: purpose.trim(),
        },
        declaredMonthlyIncome: Number(declaredIncome),
        salaryCredits,
        documents,
      };

      if (editApp) {
        await editTestApplication(token, editApp.id, payload);
      } else {
        await createTestApplication(token, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B192C] p-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">
              {editApp ? `Edit Fictional Record (${editApp.id})` : 'Add Fictional Test Application'}
            </h2>
            <p className="text-xs text-slate-300">
              {editApp
                ? 'Modifying fields will invalidate previous verification results.'
                : 'Generates a new test application with automatic ID assignment.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Details */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-wider">1. Customer Particulars</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Customer Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Suresh Patel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Age</label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Employer Name</label>
                <input
                  type="text"
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  placeholder="e.g. Vertex Software Labs"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Employment Type</label>
                <select
                  value={employment}
                  onChange={(e) => setEmployment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Salaried">Salaried</option>
                  <option value="Self-Employed">Self-Employed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-wider">2. Loan Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Loan Type</label>
                <select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="Home Loan">Home Loan</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Vehicle Loan">Vehicle Loan</option>
                  <option value="Education Loan">Education Loan</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Loan Amount (₹)</label>
                <input
                  type="number"
                  min={10000}
                  step={5000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tenure (Months)</label>
                <input
                  type="number"
                  min={6}
                  max={360}
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Loan Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Purchase of commercial property"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* Income & Salary Credits */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-wider">
              3. Income & Salary Credit Records
            </h3>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Declared Monthly Income (₹)</label>
              <input
                type="number"
                min={5000}
                step={1000}
                value={declaredIncome}
                onChange={(e) => setDeclaredIncome(Number(e.target.value))}
                className="w-full sm:w-1/2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-slate-600 font-semibold">Observed Salary Credits Array (₹)</label>
                <button
                  type="button"
                  onClick={handleAddCredit}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-[11px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Month</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {salaryCredits.map((credit, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-mono text-[11px] w-6">M{idx + 1}</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={credit}
                      onChange={(e) => handleUpdateCredit(idx, Number(e.target.value))}
                      className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 text-xs font-mono font-bold"
                      required
                    />
                    {salaryCredits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCredit(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Document Checklist */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 uppercase tracking-wider">4. Document Statuses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800">{doc.name}</span>
                  <select
                    value={doc.status}
                    onChange={(e) => handleUpdateDocStatus(idx, e.target.value as DocumentStatus)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? 'Saving...' : editApp ? 'Update Application' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
