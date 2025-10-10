import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { techniciansAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { theme } from '../styles/theme';

export default function BasicEquipmentScreen() {
  const { user } = useContext(AuthContext);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, [user?._id]);

  const fetchEquipment = async () => {
    if (!user?._id) return;
    try {
      const response = await techniciansAPI.getBasicEquipment(user._id);
      setEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju osnovne opreme:', error);
      Alert.alert('Greška', 'Neuspešno učitavanje osnovne opreme');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const filteredEquipment = useMemo(() => {
    return equipment.filter(item =>
      searchTerm === '' ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [equipment, searchTerm]);

  // Types for statistics
  const types = useMemo(() => [...new Set(equipment.map(item => item.type))], [equipment]);

  const stats = useMemo(() => ({
    total: equipment.length,
    totalQuantity: equipment.reduce((sum, e) => sum + (e.quantity || 0), 0),
    byType: types.reduce((acc, type) => {
      const typeItems = equipment.filter(item => item.type === type);
      acc[type] = {
        count: typeItems.length,
        quantity: typeItems.reduce((sum, item) => sum + item.quantity, 0)
      };
      return acc;
    }, {})
  }), [equipment, types]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderEquipmentItem = ({ item }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>x{item.quantity || 0}</Text>
        </View>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.name}>{item.type}</Text>
        <Text style={styles.description}>Osnovna oprema</Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Osnovna Oprema</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: theme.colors.primary }]}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tipova</Text>
          </View>
          <View style={[styles.statCard, { borderColor: theme.colors.success }]}>
            <Text style={styles.statValue}>{stats.totalQuantity}</Text>
            <Text style={styles.statLabel}>Ukupno</Text>
          </View>
          {Object.entries(stats.byType).slice(0, 1).map(([type, data]) => (
            <View key={type} style={[styles.statCard, { borderColor: '#9333EA' }]}>
              <Text style={styles.statValue}>{data.quantity}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>{type}</Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={currentItems}
        renderItem={renderEquipmentItem}
        keyExtractor={(item) => item.id || item.type}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm ? 'Nema rezultata' : 'Nemate zadužene osnovne opreme'}
            </Text>
          </View>
        }
        ListFooterComponent={
          filteredEquipment.length > itemsPerPage ? (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>‹</Text>
              </TouchableOpacity>

              <View style={styles.paginationInfo}>
                <Text style={styles.paginationText}>Stranica {currentPage} od {totalPages}</Text>
              </View>

              <TouchableOpacity
                style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                onPress={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <Text style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>›</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pretraga</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.searchInput} placeholder="Pretraži..." value={searchTerm} onChangeText={setSearchTerm} />
            <Button onPress={() => setShowFilters(false)} style={styles.applyButton}>Primeni</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.gray[50] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.white, borderBottomWidth: 1, borderBottomColor: theme.colors.gray[200] },
  title: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.gray[900] },
  filterButton: { padding: theme.spacing.sm, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md },
  filterButtonText: { color: theme.colors.white, fontSize: theme.fontSize.md },
  statsContainer: { padding: theme.spacing.md, backgroundColor: theme.colors.white, marginBottom: theme.spacing.sm },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statCard: { flex: 1, backgroundColor: theme.colors.gray[50], padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, borderLeftWidth: 4 },
  statValue: { fontSize: theme.fontSize.xxl, fontWeight: 'bold', color: theme.colors.gray[900], marginBottom: theme.spacing.xs },
  statLabel: { fontSize: theme.fontSize.sm, color: theme.colors.gray[600], textTransform: 'uppercase' },
  listContainer: { padding: theme.spacing.md },
  itemCard: { marginBottom: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: '#9333EA' },
  itemHeader: { marginBottom: theme.spacing.sm },
  quantityBadge: { backgroundColor: '#9333EA20', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm, alignSelf: 'flex-start' },
  quantityText: { fontSize: theme.fontSize.sm, fontWeight: 'bold', color: '#9333EA' },
  itemBody: { marginTop: theme.spacing.sm },
  name: { fontSize: theme.fontSize.lg, fontWeight: 'bold', color: theme.colors.gray[900], marginBottom: theme.spacing.xs },
  description: { fontSize: theme.fontSize.sm, color: theme.colors.gray[600] },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.gray[500], textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.white, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: 'bold', color: theme.colors.gray[900] },
  closeButton: { fontSize: theme.fontSize.xxl, color: theme.colors.gray[600], fontWeight: 'bold' },
  searchInput: { borderWidth: 1, borderColor: theme.colors.gray[300], borderRadius: theme.borderRadius.md, padding: theme.spacing.md, fontSize: theme.fontSize.md },
  applyButton: { marginTop: theme.spacing.lg },
  paginationContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.md },
  paginationButton: { width: 44, height: 44, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  paginationButtonDisabled: { backgroundColor: theme.colors.gray[300] },
  paginationButtonText: { color: theme.colors.white, fontSize: theme.fontSize.xl, fontWeight: 'bold' },
  paginationButtonTextDisabled: { color: theme.colors.gray[500] },
  paginationInfo: { flex: 1, alignItems: 'center' },
  paginationText: { fontSize: theme.fontSize.sm, color: theme.colors.gray[600], fontWeight: '600' },
});
