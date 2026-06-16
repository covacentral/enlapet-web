import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, addDoc, updateDoc, increment, query, orderBy } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { FileText, Plus, DollarSign, Wallet, CreditCard, Search, X, Check, Save } from 'lucide-react';
import styles from './ClinicBillingPanel.module.css';

export default function ClinicBillingPanel({ user, clinicId, plan }) {
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Formulario de Factura
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // 'efectivo' | 'transferencia' | 'tarjeta'
  const [items, setItems] = useState([
    { description: 'Consulta Médica General', qty: 1, unitPrice: 40000, taxRate: 0 } // La consulta veterinaria suele estar excluida de IVA en Colombia
  ]);

  useEffect(() => {
    if (!user) return;
    const invRef = collection(db, 'clinics', clinicId, 'invoices');
    const q = query(invRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setInvoices(list);
      setLoading(false);
    });

    // Cargar inventario para poder facturar productos fácilmente
    const stockRef = collection(db, 'clinics', clinicId, 'inventory');
    const unsubscribeStock = onSnapshot(stockRef, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setInventory(list);
    });

    return () => {
      unsubscribe();
      unsubscribeStock();
    };
  }, [clinicId]);

  const handleAddItem = () => {
    setItems([...items, { description: '', qty: 1, unitPrice: 0, taxRate: 0 }]);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    const list = [...items];
    if (field === 'inventorySelect') {
      const product = inventory.find(p => p.id === value);
      if (product) {
        list[idx].description = product.name;
        list[idx].unitPrice = product.salePrice;
        list[idx].productId = product.id; // Vincular para posterior descuento
      }
    } else {
      list[idx][field] = value;
    }
    setItems(list);
  };

  // Calcular totales
  const subtotal = items.reduce((acc, curr) => acc + (curr.qty * curr.unitPrice), 0);
  const taxTotal = items.reduce((acc, curr) => {
    const itemTotal = curr.qty * curr.unitPrice;
    return acc + (itemTotal * (curr.taxRate / 100));
  }, 0);
  const total = subtotal + taxTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Debes agregar al menos un concepto a la factura.");
      return;
    }

    try {
      const invoiceData = {
        clientName,
        clientDoc,
        paymentMethod,
        items: items.map(i => ({
          description: i.description,
          qty: parseInt(i.qty) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
          taxRate: parseFloat(i.taxRate) || 0,
          subtotal: i.qty * i.unitPrice
        })),
        totals: {
          subtotal,
          tax: taxTotal,
          total
        },
        createdAt: new Date().toISOString()
      };

      const invCol = collection(db, 'clinics', clinicId, 'invoices');
      await addDoc(invCol, invoiceData);

      // Descontar stock del inventario para items vinculados a productos
      for (const item of items) {
        if (item.productId) {
          const prodRef = doc(db, 'clinics', clinicId, 'inventory', item.productId);
          await updateDoc(prodRef, {
            stock: increment(-(parseInt(item.qty) || 1)),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Cerrar formulario y limpiar
      setShowForm(false);
      setClientName('');
      setClientDoc('');
      setPaymentMethod('efectivo');
      setItems([{ description: 'Consulta Médica General', qty: 1, unitPrice: 40000, taxRate: 0 }]);
      alert("Factura registrada con éxito.");
    } catch (err) {
      console.error(err);
      alert("Error al registrar factura.");
    }
  };

  // Cuadre de caja: SOLO facturas de HOY
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(i => i.createdAt?.startsWith(todayStr));
  const cashTotal     = todayInvoices.filter(i => i.paymentMethod === 'efectivo').reduce((acc, c) => acc + (c.totals?.total || 0), 0);
  const transferTotal = todayInvoices.filter(i => i.paymentMethod === 'transferencia').reduce((acc, c) => acc + (c.totals?.total || 0), 0);
  const cardTotal     = todayInvoices.filter(i => i.paymentMethod === 'tarjeta').reduce((acc, c) => acc + (c.totals?.total || 0), 0);
  const ledgerTotal   = cashTotal + transferTotal + cardTotal;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Caja y Facturación</h2>
          <p>Registra ventas, realiza cierres de caja y gestiona el cobro de consultas.</p>
        </div>
        <button onClick={() => setShowForm(true)} className={styles.addBtn}>
          <Plus size={18} />
          <span>Generar Factura</span>
        </button>
      </div>

      {/* Resumen Contable / Cuadre de Caja */}
      <div className={styles.ledgerGrid}>
        <div className={styles.ledgerCard}>
          <div className={styles.ledgerHeader}>
            <DollarSign className={styles.cashIcon} />
            <span>Efectivo en Caja</span>
          </div>
          <h3>${cashTotal.toLocaleString('es-CO')} COP</h3>
        </div>

        <div className={styles.ledgerCard}>
          <div className={styles.ledgerHeader}>
            <Wallet className={styles.transferIcon} />
            <span>Transferencias (Nequi/Daviplata)</span>
          </div>
          <h3>${transferTotal.toLocaleString('es-CO')} COP</h3>
        </div>

        <div className={styles.ledgerCard}>
          <div className={styles.ledgerHeader}>
            <CreditCard className={styles.cardIcon} />
            <span>Datáfono / Tarjetas</span>
          </div>
          <h3>${cardTotal.toLocaleString('es-CO')} COP</h3>
        </div>

        <div className={styles.ledgerCardTotal}>
          <div className={styles.ledgerHeader}>
            <DollarSign className={styles.totalIcon} />
            <span>Cierre Total del Día</span>
          </div>
          <h3>${ledgerTotal.toLocaleString('es-CO')} COP</h3>
        </div>
      </div>

      {/* Listado de Facturas */}
      <div className={styles.tableCard}>
        <h3>Historial de Ventas</h3>
        {loading ? (
          <div className={styles.loader}>Cargando facturas...</div>
        ) : invoices.length === 0 ? (
          <div className={styles.emptyState}>No se han registrado ventas hoy.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Identificación</th>
                  <th>Medio de Pago</th>
                  <th>Total Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>{new Date(invoice.createdAt).toLocaleDateString('es-CO')}</td>
                    <td className={styles.clientName}>{invoice.clientName}</td>
                    <td>{invoice.clientDoc || 'N/A'}</td>
                    <td>
                      {invoice.paymentMethod === 'efectivo' && '💵 Efectivo'}
                      {invoice.paymentMethod === 'transferencia' && '📱 Transferencia'}
                      {invoice.paymentMethod === 'tarjeta' && '💳 Tarjeta'}
                    </td>
                    <td className={styles.totalCell}>${invoice.totals.total.toLocaleString('es-CO')} COP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Facturar */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Nueva Factura / Cobro</h3>
              <button onClick={() => setShowForm(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formSection}>
                <label className={styles.sectionLabel}>Datos del Cliente</label>
                <div className={styles.formGroupRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="cliName">Nombre Completo</label>
                    <input
                      id="cliName"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="cliDoc">Documento (CC/NIT)</label>
                    <input
                      id="cliDoc"
                      type="text"
                      value={clientDoc}
                      onChange={(e) => setClientDoc(e.target.value)}
                      placeholder="Ej. 1022345678"
                    />
                  </div>
                </div>
              </div>

              {/* Items Factura */}
              <div className={styles.formSection}>
                <div className={styles.itemHeaderBlock}>
                  <label className={styles.sectionLabel}>Conceptos a Cobrar</label>
                  <button type="button" onClick={handleAddItem} className={styles.addItemBtn}>
                    + Agregar Fila
                  </button>
                </div>

                <div className={styles.itemsList}>
                  {items.map((item, idx) => (
                    <div key={idx} className={styles.itemRow}>
                      {/* Cargar desde Inventario opcionalmente */}
                      <select
                        onChange={(e) => handleItemChange(idx, 'inventorySelect', e.target.value)}
                        className={styles.inventorySelect}
                      >
                        <option value="">-- Cargar de Inventario --</option>
                        {inventory.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (${p.salePrice.toLocaleString('es-CO')})</option>
                        ))}
                      </select>

                      <div className={styles.itemRowInputs}>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Descripción del concepto"
                          required
                          className={styles.descInput}
                        />
                        
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                          required
                          min={1}
                          className={styles.qtyInput}
                          title="Cantidad"
                        />

                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          required
                          className={styles.priceInput}
                          title="Precio unitario"
                        />

                        <select
                          value={item.taxRate}
                          onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                          className={styles.taxSelect}
                          title="IVA"
                        >
                          <option value="0">0% Exento</option>
                          <option value="19">19% IVA</option>
                        </select>

                        <button type="button" onClick={() => handleRemoveItem(idx)} className={styles.removeRowBtn}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medios de Pago y Totales */}
              <div className={styles.formSectionRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="payMethod">Medio de Pago</label>
                  <select
                    id="payMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="efectivo">💵 Efectivo en Caja</option>
                    <option value="transferencia">📱 Transferencia (Nequi/Daviplata)</option>
                    <option value="tarjeta">💳 Datáfono / Tarjetas</option>
                  </select>
                </div>

                <div className={styles.totalsSummary}>
                  <div className={styles.totalLine}>
                    <span>Subtotal:</span>
                    <strong>${subtotal.toLocaleString('es-CO')} COP</strong>
                  </div>
                  <div className={styles.totalLine}>
                    <span>Impuestos (IVA):</span>
                    <strong>${taxTotal.toLocaleString('es-CO')} COP</strong>
                  </div>
                  <div className={`${styles.totalLine} ${styles.grandTotal}`}>
                    <span>Total Cobro:</span>
                    <strong>${total.toLocaleString('es-CO')} COP</strong>
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" className={styles.saveBtn}>
                  <Check size={16} />
                  <span>Cerrar Factura y Cobrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
