import { useState, useMemo } from 'react';
import { Plus, Trash2, Package, Scale, Box } from 'lucide-react';
import { FormField, Row } from './ui/Form';

const COLIS_TYPES = [
  { value: 'document', label: 'Document' },
  { value: 'paquet', label: 'Paquet' },
  { value: 'palette', label: 'Palette' },
];

const MAX_COLIS = 32;

function emptyColis(index) {
  return {
    position: index,
    nb_pieces: 1,
    poids: '',
    longueur: '',
    largeur: '',
    hauteur: '',
    type_colis: 'paquet',
    description_colis: '',
  };
}

function calcColisTotals(item) {
  const pieces = Number(item.nb_pieces) || 0;
  const weight = Number(item.poids) || 0;
  const length = Number(item.longueur) || 0;
  const width = Number(item.largeur) || 0;
  const height = Number(item.hauteur) || 0;

  let totalWeight = pieces * weight;
  let totalVolume = 0;
  if (length > 0 && width > 0 && height > 0) {
    totalVolume = pieces * (length / 100) * (width / 100) * (height / 100);
  }
  return { totalWeight, totalVolume, pieces };
}

export function MultiColisForm({ colis = [], onChange, disabled = false, showTotals = true }) {
  const [items, setItems] = useState(
    colis.length > 0 ? colis.map((c, i) => ({ ...c, position: i })) : [emptyColis(0)]
  );

  const handleItemChange = (index, field, value) => {
    const newItems = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
    onChange?.(newItems);
  };

  const addColis = () => {
    if (items.length >= MAX_COLIS) return;
    const newItems = [...items, emptyColis(items.length)];
    setItems(newItems);
    onChange?.(newItems);
  };

  const removeColis = (index) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i }));
    setItems(newItems);
    onChange?.(newItems);
  };

  const totals = useMemo(() => {
    let totalWeight = 0;
    let totalVolume = 0;
    let totalPieces = 0;

    items.forEach((item) => {
      const pieces = Number(item.nb_pieces) || 0;
      const weight = Number(item.poids) || 0;
      const length = Number(item.longueur) || 0;
      const width = Number(item.largeur) || 0;
      const height = Number(item.hauteur) || 0;

      totalPieces += pieces;
      totalWeight += pieces * weight;

      if (length > 0 && width > 0 && height > 0) {
        totalVolume += pieces * (length / 100) * (width / 100) * (height / 100);
      }
    });

    return { totalWeight, totalVolume, totalPieces };
  }, [items]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 , marginBottom: 30}}>
      {items.map((item, index) => {
        const { totalWeight, totalVolume } = calcColisTotals(item);
        const showDelete = items.length > 1;
        return (
          <div
            key={index}
            style={{
              border: '1px solid var(--color-mist)',
              borderRadius: 12,
              padding: 16,
              background: 'var(--color-bone)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            }}
          >
            <Row gap={12} wrap={true} style={{ marginBottom: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} style={{ color: 'var(--color-primary)' }} />
                <strong>Colis {index + 1}</strong>
              </div>
              {showDelete && (
                <button
                  type="button"
                  onClick={() => removeColis(index)}
                  disabled={disabled}
                  className="btn btn-ghost"
                  style={{ padding: 4, marginLeft: 'auto' }}
                  title="Supprimer ce colis"
                >
                  <Trash2 size={16} style={{ color: 'var(--color-danger)' }} />
                </button>
              )}
            </Row>

            <Row gap={16} wrap={true} style={{ marginBottom: 8 }}>
              <FormField label="Type" style={{ flex: '0 0 130px' }}>
                <select
                  value={item.type_colis}
                  onChange={(e) => handleItemChange(index, 'type_colis', e.target.value)}
                  className="select"
                  disabled={disabled}
                  style={{ width: '100%' }}
                >
                  {COLIS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Pièces" style={{ flex: '0 0 100px' }}>
                <input
                  type="number"
                  min="1"
                  value={item.nb_pieces}
                  onChange={(e) => handleItemChange(index, 'nb_pieces', Number(e.target.value) || 1)}
                  className="input"
                  disabled={disabled}
                  style={{ width: '100%' }}
                />
              </FormField>

              <FormField label="Poids / pièce (kg)" style={{ flex: '0 0 150px' }}>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={item.poids}
                  onChange={(e) => handleItemChange(index, 'poids', e.target.value ? Number(e.target.value) : '')}
                  className="input"
                  disabled={disabled}
                  style={{ width: '100%' }}
                />
              </FormField>

              <FormField label="Description" style={{ flex: '1 1 280px' }}>
                <input
                  type="text"
                  maxLength={60}
                  value={item.description_colis}
                  onChange={(e) => handleItemChange(index, 'description_colis', e.target.value)}
                  className="input"
                  disabled={disabled}
                  style={{ width: '100%' }}
                  placeholder="Description optionnelle"
                />
              </FormField>
            </Row>

            <Row gap={16} wrap={true} style={{ marginBottom: 8 }}>
              <FormField label="Longueur (cm)" style={{ flex: '1 1 130px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.longueur}
                  onChange={(e) => handleItemChange(index, 'longueur', e.target.value ? Number(e.target.value) : '')}
                  className="input"
                  disabled={disabled}
                  style={{ width: '100%' }}
                />
              </FormField>

              <FormField label="Largeur (cm)" style={{ flex: '1 1 130px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.largeur}
                  onChange={(e) => handleItemChange(index, 'largeur', e.target.value ? Number(e.target.value) : '')}
                  className="input"
                  disabled={disabled}
                  style={{ width: '100%' }}
                />
              </FormField>

              <FormField label="Hauteur (cm)" style={{ flex: '1 1 130px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.hauteur}
                  onChange={(e) => handleItemChange(index, 'hauteur', e.target.value ? Number(e.target.value) : '')}
                  className="input"
                  disabled={disabled}
                  style={{ width: '100%' }}
                />
              </FormField>

              {showTotals && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 16,
                    flex: '0 0 auto',
                    minWidth: '220px',
                    paddingLeft: 12,
                    borderLeft: '1px solid var(--color-mist)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Scale size={13} style={{ color: 'var(--color-steel)' }} />
                    <span style={{ color: 'var(--color-steel)' }}>Poids :</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-graphite)' }}>
                      {totalWeight.toFixed(2)} kg
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                    <Box size={13} style={{ color: 'var(--color-steel)' }} />
                    <span style={{ color: 'var(--color-steel)' }}>Vol :</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-graphite)' }}>
                      {totalVolume.toFixed(3)} m&sup3;
                    </span>
                  </div>
                </div>
              )}
            </Row>
          </div>
        );
      })}

      {items.length < MAX_COLIS && (
        <button
          type="button"
          onClick={addColis}
          disabled={disabled}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '14px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, var(--color-vivid-green), var(--color-vivid-green-dark))',
            boxShadow: '0 2px 8px rgba(74, 198, 76, 0.3)',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            opacity: disabled ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 14px rgba(74, 198, 76, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 8px rgba(74, 198, 76, 0.3)';
            }
          }}
        >
          <Plus size={18} />
          Ajouter un colis
        </button>
      )}

      {items.length >= MAX_COLIS && (
        <p style={{ fontSize: 12, color: 'var(--color-smoke)', textAlign: 'center' }}>
          Maximum de {MAX_COLIS} colis atteint.
        </p>
      )}

      {showTotals && items.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: '18px 22px',
            background: 'var(--color-bone)',
            borderRadius: 12,
            border: '1px solid var(--color-mist)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-graphite)' }}>
            Totaux globaux
          </h4>
          <Row gap={24} wrap={true} style={{ justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', minWidth: 140 }}>
              <span style={{ fontSize: 10, color: 'var(--color-smoke)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Poids Total
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: 'var(--color-primary)',
                }}
              >
                {totals.totalWeight.toFixed(2)} kg
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', minWidth: 140 }}>
              <span style={{ fontSize: 10, color: 'var(--color-smoke)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Volume Total
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: 'var(--color-primary)',
                  marginBottom : 10
                }}
              >
                {totals.totalVolume.toFixed(3)} m&sup3;
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', minWidth: 120 }}>
              <span style={{ fontSize: 10, color: 'var(--color-smoke)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pièces Total
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: 'var(--color-primary)',
                }}
              >
                {totals.totalPieces}
              </span>
            </div>
          </Row>
        </div>
      )}
    </div>
  );
}