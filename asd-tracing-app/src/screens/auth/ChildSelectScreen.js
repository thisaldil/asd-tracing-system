import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getParentChildren } from '../../services/apiService';
import { useChild } from '../../context/ChildContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChildSelectScreen({ navigation }) {
  const { parentProfile, selectChild, setChildren, childrenList, logout } = useChild();
  const [loading, setLoading] = useState(false);

  // Reload children list when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadChildren();
    }, [])
  );

  const loadChildren = async () => {
    if (!parentProfile) return;
    try {
      setLoading(true);
      const children = await getParentChildren(parentProfile._id);
      setChildren(children);
    } catch (error) {
      Alert.alert('Error', 'Failed to load children');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChild = async (child) => {
    await selectChild(child);
    // No navigation needed - root navigator automatically switches to AppStack
    // because activeChild is now set
    console.log('[ChildSelect] Child selected, navigating via context state change');
  };

  const handleAddAnother = () => {
    navigation.navigate('ChildSetup');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            // No navigation needed - root navigator automatically switches to AuthStack
            // because parentProfile and authToken are cleared
            console.log('[ChildSelect] Logged out, navigating via context state change');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Hello, {parentProfile?.fullName}</Text>
            <Text style={styles.subtitle}>Select a child to trace</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutButton}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.childrenContainer}>
        {childrenList && childrenList.length > 0 ? (
          <View style={styles.childrenList}>
            {childrenList.map((child) => (
              <TouchableOpacity
                key={child._id}
                style={styles.childCard}
                onPress={() => handleSelectChild(child)}
              >
                <View style={styles.childCardContent}>
                  <Text style={styles.childName}>{child.alias}</Text>
                  <View style={styles.childDetails}>
                    <Text style={styles.childDetail}>Age: {child.age}</Text>
                    <Text style={styles.childDetail}>
                      Level {child.asdSeverityLevel}
                    </Text>
                  </View>
                  <View style={styles.verbabilityBadge}>
                    <Text style={styles.verbabilityBadgeText}>
                      {child.verbalAbility.charAt(0).toUpperCase() +
                        child.verbalAbility.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.chevron}>
                  <Text style={styles.chevronText}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No children yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add a child profile to get started
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addChildButton}
          onPress={handleAddAnother}
        >
          <Text style={styles.addChildButtonText}>+ Add Another Child</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 30,
    paddingTop: 50,
    backgroundColor: '#FFF9F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#3D2B1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8B7355',
  },
  logoutButton: {
    fontSize: 13,
    color: '#C0392B',
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C0392B',
    borderRadius: 6,
  },
  childrenContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  childrenList: {
    gap: 12,
  },
  childCard: {
    backgroundColor: '#FAFAF8',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  childCardContent: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D2B1F',
    marginBottom: 8,
  },
  childDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  childDetail: {
    fontSize: 13,
    color: '#8B7355',
  },
  verbabilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verbabilityBadgeText: {
    fontSize: 12,
    color: '#378ADD',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 12,
  },
  chevronText: {
    fontSize: 28,
    color: '#D4C4B0',
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3D2B1F',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8B7355',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8DCC8',
  },
  addChildButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addChildButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
