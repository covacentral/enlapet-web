import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase/firebase';
import { Package, Plus, Trash2, Edit2, AlertTriangle, Search, Save, X } from 'lucide-react';
import styles from './ClinicInventoryPanel.module.css';

export default function ClinicInventoryPanel({ user, clinicId, plan }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Formulario de Producto
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    stock: 0,
    minStockAlert: 5,
    costPrice: 0,
    salePrice: 0,
    category: 'medication' // 'medication' | 'vaccine' | 'procedure_item' | 'other'
  });

  useEffect(() => {
    if (!clinicId) return;
    const invRef = collection(db, 'clinics', clinicId, 'inventory');
    const unsubscribe = onSnapshot(invRef, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setInventory(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clinicId]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setProductForm({
      name: '',
      stock: 0,
      minStockAlert: 5,
      costPrice: 0,
      salePrice: 0,
      category: 'medication'
    });
    setShowForm(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setProductForm({
      name: item.name,
      stock: item.stock,
      minStockAlert: item.minStockAlert,
      costPrice: item.costPrice,
      salePrice: item.salePrice,
      category: item.category
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const invRef = collection(db, 'clinics', clinicId, 'inventory');
      const payload = {
        name: productForm.name,
        stock: parseInt(productForm.stock) || 0,
        minStockAlert: parseInt(productForm.minStockAlert) || 0,
        costPrice: parseFloat(productForm.costPrice) || 0,
        salePrice: parseFloat(productForm.salePrice) || 0,
        category: productForm.category,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        const docRef = doc(db, 'clinics', clinicId, 'inventory', editingId);
        await updateDoc(docRef, payload);
      } else {
        const newDocRef = doc(invRef);
        await setDoc(newDocRef, {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      setShowForm(false);
    } catch (err) {
      console.error("Error al guardar en inventario:", err);
      alert("Hubo un error al guardar.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este producto del inventario?")) return;
    try {
      const docRef = doc(db, 'clinics', clinicId, 'inventory', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtrado de Inventario
  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Inventario y Control de Stock</h2>
          <p>Monitorea medicamentos, vacunas e insumos clínicos de tu veterinaria.</p>
        </div>
        <button onClick={handleOpenAdd} className={styles.addBtn}>
          <Plus size={18} />
          <span>Agregar Producto</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar insumo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Alertas de Stock Bajo */}
      {inventory.some(i => i.stock <= i.minStockAlert) && (
        <div className={styles.alertPanel}>
          <AlertTriangle className={styles.alertIcon} size={20} />
          <div>
            <h4>Insumos en Stock Crítico</h4>
            <p>Hay productos que están por debajo o iguales a su umbral mínimo de stock. Recuerda reabastecerlos.</p>
          </div>
        </div>
      )}

      {/* Tabla de Productos */}
      {loading ? (
        <div className={styles.loader}>Cargando inventario...</div>
      ) : filteredInventory.length === 0 ? (
        <div className={styles.emptyState}>No hay productos registrados en el inventario.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre del Insumo</th>
                <th>Categoría</th>
                <th>Costo (Unitario)</th>
                <th>Venta (Público)</th>
                <th>Stock Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => (
                <tr key={item.id} className={item.stock <= item.minStockAlert ? styles.criticalRow : ''}>
                  <td className={styles.itemName}>{item.name}</td>
                  <td>
                    {item.category === 'medication' && 'Medicamento'}
                    {item.category === 'vaccine' && 'Vacuna'}
                    {item.category === 'procedure_item' && 'Insumo Cirugía'}
                    {item.category === 'other' && 'Otro'}
                  </td>
                  <td>${item.costPrice.toLocaleString('es-CO')} COP</td>
                  <td>${item.salePrice.toLocaleString('es-CO')} COP</td>
                  <td>
                    <span className={item.stock <= item.minStockAlert ? styles.criticalStock : styles.normalStock}>
                      {item.stock} uds {item.stock <= item.minStockAlert && '⚠'}
                    </span>
                  </td>
                  <td className={styles.actionsCell}>
                    <button onClick={() => handleOpenEdit(item)} className={styles.editBtn} aria-label="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className={styles.deleteBtn} aria-label="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Overlay Formulario */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingId ? 'Editar Insumo' : 'Agregar Nuevo Insumo'}</h3>
              <button onClick={() => setShowForm(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="prodName">Nombre del Producto / Insumo</label>
                <input
                  id="prodName"
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  placeholder="Ej. Vacuna Triple Felina - Nobivac"
                />
              </div>

              <div className={styles.formGroupRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="prodCat">Categoría</label>
                  <select
                    id="prodCat"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="medication">Medicamento</option>
                    <option value="vaccine">Vacunación</option>
                    <option value="procedure_item">Insumo Quirúrgico / Cirugía</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="prodStock">Stock Inicial</label>
                  <input
                    id="prodStock"
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    required
                    min={0}
                  />
                </div>
              </div>

              <div className={styles.formGroupRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="prodCost">Costo Unitario (Compra)</label>
                  <input
                    id="prodCost"
                    type="number"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    required
                    min={0}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="prodSale">Precio de Venta (Público)</label>
                  <input
                    id="prodSale"
                    type="number"
                    value={productForm.salePrice}
                    onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                    required
                    min={0}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="prodMin">Alerta de Stock Crítico (Mínimo)</label>
                <input
                  id="prodMin"
                  type="number"
                  value={productForm.minStockAlert}
                  onChange={(e) => setProductForm({ ...productForm, minStockAlert: e.target.value })}
                  required
                  min={0}
                  placeholder="Alerta cuando baje de esta cantidad"
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" className={styles.saveBtn}>
                  <Save size={16} />
                  <span>{editingId ? 'Guardar Cambios' : 'Registrar Producto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
