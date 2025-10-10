import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { techniciansAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { theme } from '../styles/theme';

export default function EquipmentScreen() {
  const { user } = useContext(AuthContext);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, [user?._id]);

  const fetchEquipment = async () => {
    if (!user?._id) return;

    try {
      const response = await techniciansAPI.getEquipment(user._id);
      setEquipment(response.data);
    } catch (error) {
      console.error('Greška pri učitavanju opreme:', error);
      Alert.alert('Greška', 'Neuspešno učitavanje opreme');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const categories = useMemo(() => {
    return [...new Set(equipment.map(item => item.category))];
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const searchMatch = searchTerm === '' ||
        item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === '' || item.category === categoryFilter;
      return searchMatch && categoryMatch;
    });
  }, [equipment, searchTerm, categoryFilter]);

  const sortedEquipment = useMemo(() => {
    return [...filteredEquipment].sort((a, b) => {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      return a.serialNumber.localeCompare(b.serialNumber);
    });
  }, [filteredEquipment]);

  const stats = useMemo(() => ({
    total: equipment.length,
    byCategory: categories.reduce((acc, cat) => ({
      ...acc,
      [cat]: equipment.filter(item => item.category === cat).length
    }), {})
  }), [equipment, categories]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedEquipment.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedEquipment.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('sr-RS');
  };

  const renderEquipmentItem = ({ item }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Text style={styles.dateText}>📅 {formatDate(item.assignedAt)}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.description}>{item.description}</Text>
        <View style={styles.serialRow}>
          <Text style={styles.serialLabel}>S/N:</Text>
          <Text style={styles.serialNumber}>{item.serialNumber}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Moja Oprema</Text>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: theme.colors.primary }]}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Ukupno</Text>
          </View>
          {Object.entries(stats.byCategory).slice(0, 2).map(([category, count]) => (
            <View key={category} style={[styles.statCard, { borderColor: theme.colors.success }]}>
              <Text style={styles.statValue}>{count}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>{category}</Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={currentItems}
        renderItem={renderEquipmentItem}
        keyExtractor={(item) => item.id || item.serialNumber}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm || categoryFilter ? 'Nema rezultata' : 'Nemate zadužene opreme'}
            </Text>
          </View>
        }
        ListFooterComponent={
          sortedEquipment.length > itemsPerPage ? (
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
              <Text style={styles.modalTitle}>Filteri</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.filterLabel}>Pretraga</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Pretraži..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            <Button onPress={() => setShowFilters(false)} style={styles.applyButton}>
              Primeni
            </Button>
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
  itemCard: { marginBottom: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: theme.colors.success },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  categoryBadge: { backgroundColor: theme.colors.success + '20', paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.borderRadius.sm },
  categoryText: { fontSize: theme.fontSize.xs, fontWeight: 'bold', color: theme.colors.success },
  dateText: { fontSize: theme.fontSize.xs, color: theme.colors.gray[600] },
  itemBody: { marginTop: theme.spacing.sm },
  description: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.gray[900], marginBottom: theme.spacing.sm },
  serialRow: { flexDirection: 'row' },
  serialLabel: { fontSize: theme.fontSize.sm, fontWeight: 'bold', color: theme.colors.gray[600], marginRight: theme.spacing.xs },
  serialNumber: { fontSize: theme.fontSize.sm, color: theme.colors.gray[700], fontFamily: 'monospace' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.gray[500], textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.white, borderTopLeftRadius: theme.borderRadius.xl, borderTopRightRadius: theme.borderRadius.xl, padding: theme.spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  modalTitle: { fontSize: theme.fontSize.xl, fontWeight: 'bold', color: theme.colors.gray[900] },
  closeButton: { fontSize: theme.fontSize.xxl, color: theme.colors.gray[600], fontWeight: 'bold' },
  filterLabel: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.gray[700], marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
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
