/**
 * Lux lock-in tests for the Eve fix pass (2026-11-13):
 * EVE-013 — the MSI editor can clear MSI (checkbox + mensualidad inputs)
 *           and re-set it afterwards; the commit payload follows state.
 * EVE-015 — thirdPartyName from the import contract reaches the payload.
 * EVE-017 — the commit button counts only committable rows and the UI
 *           names the selected rows that save will skip.
 * JSON intake path only; no Firestore, no PDF extraction involved.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import StatementImporter from '@/components/StatementImporter';

async function openJsonReview(expenses: unknown[]) {
  const onExpenseAdded = vi.fn(async () => ({}));
  render(<StatementImporter onExpenseAdded={onExpenseAdded} existingExpenses={[]} />);
  fireEvent.click(screen.getByRole('tab', { name: /Archivo de Ryuko/ }));
  const doc = {
    format: 'sheriff-statement-import', version: '1.0',
    source: { bank: 'amex', statementId: 'lux-fixpass' },
    expenses,
  };
  fireEvent.change(screen.getByLabelText(/Contenido del archivo de importación/), {
    target: { value: JSON.stringify(doc) },
  });
  fireEvent.click(screen.getByRole('button', { name: /Revisar importación/ }));
  await screen.findByText('Revisar transacciones');
  return onExpenseAdded;
}

const importBtn = () => screen.getByRole('button', { name: /Importar \d+ gastos/ });
const rowCard = (desc: string) =>
  screen.getByText(desc).closest('div.rounded-2xl') as HTMLElement;
const msiCheckbox = (card: HTMLElement) =>
  card.querySelector('input[type="checkbox"]') as HTMLInputElement;

const MSI_ROW = {
  date: '2026-04-16', description: 'LIVERPOOL TEST', amount: 500,
  category: 'Ropa', card: 'amex', paidBy: 'boyfriend', msi: { current: 3, total: 12 },
};

describe('EVE-013 — MSI editor clear', () => {
  it('unchecking "Es MSI" clears state and the commit payload carries no MSI keys', async () => {
    const onExpenseAdded = await openJsonReview([MSI_ROW]);
    const card = rowCard('LIVERPOOL TEST');
    fireEvent.click(within(card).getAllByRole('button')[1]); // expand
    const box = msiCheckbox(card);
    expect(box.checked).toBe(true);
    fireEvent.click(box); // Kevin says: this is NOT MSI
    expect(msiCheckbox(rowCard('LIVERPOOL TEST')).checked).toBe(false);
    expect(screen.queryByText(/MSI 3\/12/)).toBeNull();
    fireEvent.click(importBtn());
    await vi.waitFor(() => expect(onExpenseAdded).toHaveBeenCalledTimes(1));
    const payload = onExpenseAdded.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.description).toBe('LIVERPOOL TEST');
    expect('msiCurrent' in payload).toBe(false);
    expect('msiTotal' in payload).toBe(false);
  });

  it('clearing a mensualidad input clears the pair too', async () => {
    const onExpenseAdded = await openJsonReview([MSI_ROW]);
    const card = rowCard('LIVERPOOL TEST');
    fireEvent.click(within(card).getAllByRole('button')[1]); // expand
    fireEvent.change(within(card).getByLabelText('Total de mensualidades'), {
      target: { value: '' },
    });
    expect(msiCheckbox(rowCard('LIVERPOOL TEST')).checked).toBe(false);
    expect(screen.queryByText(/MSI 3\/12/)).toBeNull();
    fireEvent.click(importBtn());
    await vi.waitFor(() => expect(onExpenseAdded).toHaveBeenCalledTimes(1));
    const payload = onExpenseAdded.mock.calls[0][0] as Record<string, unknown>;
    expect('msiCurrent' in payload).toBe(false);
    expect('msiTotal' in payload).toBe(false);
  });

  it('MSI can be set again after a clear, and the new pair commits', async () => {
    const onExpenseAdded = await openJsonReview([MSI_ROW]);
    let card = rowCard('LIVERPOOL TEST');
    fireEvent.click(within(card).getAllByRole('button')[1]); // expand
    fireEvent.click(msiCheckbox(card)); // clear
    card = rowCard('LIVERPOOL TEST');
    expect(msiCheckbox(card).checked).toBe(false);
    fireEvent.click(msiCheckbox(card)); // set again -> defaults 1/12
    card = rowCard('LIVERPOOL TEST');
    expect(msiCheckbox(card).checked).toBe(true);
    expect(screen.getByText(/MSI 1\/12/)).toBeTruthy();
    fireEvent.click(importBtn());
    await vi.waitFor(() => expect(onExpenseAdded).toHaveBeenCalledTimes(1));
    const payload = onExpenseAdded.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.msiCurrent).toBe(1);
    expect(payload.msiTotal).toBe(12);
  });
});

describe('EVE-015 — thirdPartyName carried through', () => {
  it('shows in the editor and lands in the commit payload', async () => {
    const onExpenseAdded = await openJsonReview([{
      date: '2026-04-15', description: 'FARMACIA TEST', amount: 200,
      category: 'Salud', card: 'amex', paidBy: 'boyfriend', thirdPartyName: 'Juan Perez',
    }]);
    const card = rowCard('FARMACIA TEST');
    fireEvent.click(within(card).getAllByRole('button')[1]); // expand
    expect(within(card).getByDisplayValue('Juan Perez')).toBeTruthy();
    fireEvent.click(importBtn());
    await vi.waitFor(() => expect(onExpenseAdded).toHaveBeenCalledTimes(1));
    const payload = onExpenseAdded.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.thirdPartyName).toBe('Juan Perez');
  });
});

describe('EVE-017 — commit button counts only committable rows', () => {
  it('a force-selected missing-description row is excluded from the count and named in the skip line', async () => {
    const onExpenseAdded = await openJsonReview([
      { date: '2026-04-12', description: 'UBER TEST', amount: 100, category: 'Transporte', card: 'amex', paidBy: 'boyfriend' },
      { date: '2026-04-14', description: '', amount: 75, category: 'Otro', card: 'amex', paidBy: 'boyfriend' },
    ]);
    // missing-description row starts unselected: no gap yet
    expect(screen.queryByText(/NO se guardarán/)).toBeNull();
    expect(importBtn().textContent).toContain('Importar 1 gastos');
    // Kevin force-selects it anyway
    const card = rowCard('(sin descripción)');
    fireEvent.click(within(card).getAllByRole('button')[0]);
    // the button still promises only the committable row, and the gap is named
    expect(importBtn().textContent).toContain('Importar 1 gastos');
    expect(importBtn().textContent).toContain('$100.00');
    const skipLine = screen.getByText(/NO se guardarán/);
    expect(skipLine.textContent).toContain('sin descripción');
    fireEvent.click(importBtn());
    await vi.waitFor(() => expect(onExpenseAdded).toHaveBeenCalledTimes(1));
    const payload = onExpenseAdded.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.description).toBe('UBER TEST');
  });
});
