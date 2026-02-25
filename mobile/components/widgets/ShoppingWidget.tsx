import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { T } from '../../theme';
import WidgetShell, { WidgetPhase } from './WidgetShell';

const SHOP_PROVIDERS = [
  { id: 'amazon', name: 'Amazon', color: '#FF9900', tagline: 'Everything store' },
  { id: 'ebay', name: 'eBay', color: '#E53238', tagline: 'Buy & sell anything' },
  { id: 'target', name: 'Target', color: '#CC0000', tagline: 'Expect more, pay less' },
  { id: 'etsy', name: 'Etsy', color: '#F1641E', tagline: 'Handmade & unique' },
];

interface Product {
  id: string;
  name: string;
  price: string;
  rating: number;
  color: string;
  sizes: string[];
}

interface Props {
  phase: WidgetPhase;
  data: {
    query?: string;
    category?: string;
    results?: Product[];
    status?: string;
    product_name?: string;
    size?: string;
    color?: string;
    cart_total?: string;
    provider?: string;
  };
  onDismiss: () => void;
  onSelectProvider?: (providerId: string) => void;
}

export default function ShoppingWidget({ phase, data, onDismiss, onSelectProvider }: Props) {
  const isCartResult = !!data.status;

  return (
    <WidgetShell
      title="Shopping"
      subtitle={isCartResult ? data.product_name : data.query ? `"${data.query}"` : 'Browsing'}
      phase={phase}
      searchingLabel="Searching products"
      onDismiss={onDismiss}
    >
      {phase === 'providers' ? (
        <ProvidersView onSelect={onSelectProvider} />
      ) : isCartResult ? (
        <CartConfirmView data={data} onDismiss={onDismiss} />
      ) : (
        <ProductListView results={data.results || []} provider={data.provider} onDismiss={onDismiss} />
      )}
    </WidgetShell>
  );
}

function ProvidersView({ onSelect }: { onSelect?: (id: string) => void }) {
  return (
    <View>
      <Text style={prov.label}>SHOP ON</Text>
      <View style={prov.grid}>
        {SHOP_PROVIDERS.map((p) => (
          <TouchableOpacity key={p.id} style={prov.card} activeOpacity={0.6} onPress={() => onSelect?.(p.id)}>
            <View style={[prov.iconCircle, { backgroundColor: p.color }]}>
              <Text style={prov.iconLetter}>{p.name.charAt(0)}</Text>
            </View>
            <Text style={prov.provName}>{p.name}</Text>
            <Text style={prov.tagline}>{p.tagline}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const prov = StyleSheet.create({
  label: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.semibold, letterSpacing: T.trackingWidest, marginBottom: T.s4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2 },
  card: {
    width: '48%' as any,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: T.radiusSm,
    padding: T.s4,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: T.s3 },
  iconLetter: { color: '#FFFFFF', fontSize: T.fontLg, fontWeight: T.bold },
  provName: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.medium, marginBottom: 2 },
  tagline: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.light, textAlign: 'center' },
});

function ProductListView({ results, provider, onDismiss }: { results: Product[]; provider?: string; onDismiss: () => void }) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const storeName = SHOP_PROVIDERS.find(p => p.id === provider)?.name;

  if (selected) {
    return (
      <View>
        {storeName && (
          <View style={s.providerBadge}><Text style={s.providerText}>ON {storeName.toUpperCase()}</Text></View>
        )}
        <Text style={s.prodName}>{selected.name}</Text>
        <Text style={s.prodPrice}>{selected.price}</Text>
        <Text style={s.sizeLabel}>SIZE</Text>
        <View style={s.sizeRow}>
          {selected.sizes.map((sz) => (
            <TouchableOpacity key={sz} style={[s.sizeBtn, selectedSize === sz && s.sizeBtnActive]} onPress={() => setSelectedSize(sz)}>
              <Text style={[s.sizeBtnText, selectedSize === sz && s.sizeBtnTextActive]}>{sz}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.detailActions}>
          <TouchableOpacity style={s.backBtn} onPress={() => setSelected(null)}>
            <Text style={s.backText}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cartBtn} onPress={onDismiss}>
            <Text style={s.cartText}>ADD TO CART</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      {storeName && (
        <View style={s.providerBadge}><Text style={s.providerText}>RESULTS FROM {storeName.toUpperCase()}</Text></View>
      )}
      <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
        <View style={s.list}>
          {results.map((p) => (
            <TouchableOpacity key={p.id} style={s.productCard} onPress={() => { setSelected(p); setSelectedSize(p.sizes[0]); }} activeOpacity={0.6}>
              <View style={s.productLeft}>
                <Text style={s.productName}>{p.name}</Text>
                <Text style={s.productMeta}>{p.color}</Text>
              </View>
              <View style={s.productRight}>
                <Text style={s.productPrice}>{p.price}</Text>
                <Text style={s.productRating}>{'★'.repeat(Math.round(p.rating))} {p.rating}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CartConfirmView({ data, onDismiss }: { data: Props['data']; onDismiss: () => void }) {
  return (
    <View>
      <View style={s.cartConfirm}>
        <View style={s.checkDot} />
        <Text style={s.cartStatus}>{data.status}</Text>
      </View>
      <View style={s.cartDetails}>
        <View style={s.cartRow}><Text style={s.cartLabel}>SIZE</Text><Text style={s.cartValue}>{data.size || 'M'}</Text></View>
        <View style={s.cartRow}><Text style={s.cartLabel}>COLOR</Text><Text style={s.cartValue}>{data.color || 'Black'}</Text></View>
        <View style={s.cartRow}><Text style={s.cartLabel}>TOTAL</Text><Text style={[s.cartValue, { color: T.success }]}>{data.cart_total}</Text></View>
      </View>
      <TouchableOpacity style={s.dismissBtn} onPress={onDismiss}>
        <Text style={s.dismissText}>DISMISS</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  providerBadge: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: T.radiusXs, paddingHorizontal: T.s3, paddingVertical: T.s1, alignSelf: 'flex-start', marginBottom: T.s4 },
  providerText: { color: T.textSecondary, fontSize: 9, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
  list: { gap: T.s2 },
  productCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: T.radiusSm, padding: T.s4, borderWidth: 1, borderColor: T.border },
  productLeft: { flex: 1 },
  productName: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.medium },
  productMeta: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.light, marginTop: 2 },
  productRight: { alignItems: 'flex-end' },
  productPrice: { color: T.success, fontSize: T.fontMd, fontWeight: T.light },
  productRating: { color: T.textTertiary, fontSize: T.fontSm, marginTop: 2 },
  prodName: { color: T.textPrimary, fontSize: T.fontLg, fontWeight: T.medium, marginBottom: T.s1 },
  prodPrice: { color: T.success, fontSize: T.fontXl, fontWeight: T.light, marginBottom: T.s5 },
  sizeLabel: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.semibold, letterSpacing: T.trackingWidest, marginBottom: T.s3 },
  sizeRow: { flexDirection: 'row', gap: T.s2, marginBottom: T.s5 },
  sizeBtn: { paddingHorizontal: T.s4, paddingVertical: T.s2, borderRadius: T.radiusXs, borderWidth: 1, borderColor: T.border },
  sizeBtnActive: { borderColor: T.accent, backgroundColor: T.accentLight },
  sizeBtnText: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.medium },
  sizeBtnTextActive: { color: T.accent },
  detailActions: { flexDirection: 'row', gap: T.s3 },
  backBtn: { flex: 1, paddingVertical: T.s3, borderRadius: T.radiusSm, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  backText: { color: T.textTertiary, fontSize: T.fontSm, fontWeight: T.semibold, letterSpacing: T.trackingWide },
  cartBtn: { flex: 2, paddingVertical: T.s3, borderRadius: T.radiusSm, backgroundColor: T.accent, alignItems: 'center' },
  cartText: { color: T.textPrimary, fontSize: T.fontSm, fontWeight: T.semibold, letterSpacing: T.trackingWide },
  cartConfirm: { flexDirection: 'row', alignItems: 'center', marginBottom: T.s4 },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.success, marginRight: T.s2 },
  cartStatus: { color: T.success, fontSize: T.fontSm, fontWeight: T.semibold, letterSpacing: T.trackingWide, textTransform: 'uppercase' },
  cartDetails: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: T.radiusSm, padding: T.s4, marginBottom: T.s5, gap: T.s3 },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cartLabel: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
  cartValue: { color: T.textPrimary, fontSize: T.fontBase, fontWeight: T.light },
  dismissBtn: { borderTopWidth: 1, borderTopColor: T.border, paddingTop: T.s4, alignItems: 'center' },
  dismissText: { color: T.textTertiary, fontSize: T.fontXs, fontWeight: T.semibold, letterSpacing: T.trackingWidest },
});
