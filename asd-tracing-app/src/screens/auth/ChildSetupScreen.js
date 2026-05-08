import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { createChild, getParentChildren } from '../../services/apiService';
import { useChild } from '../../context/ChildContext';

export default function ChildSetupScreen({ navigation }) {
  const { parentProfile, setChildren } = useChild();
  const [alias, setAlias] = useState('');
  const [age, setAge] = useState('5');
  const [asdSeverityLevel, setAsdSeverityLevel] = useState(1);
  const [verbalAbility, setVerbalAbility] = useState('limited');
  const [loading, setLoading] = useState(false);

  const handleAddChild = async () => {
    if (!alias) {
      Alert.alert('Error', 'Please enter a child name or alias');
      return;
    }

    if (!age || parseInt(age) < 3 || parseInt(age) > 18) {
      Alert.alert('Error', 'Please enter a valid age (3-18)');
      return;
    }

    setLoading(true);
    try {
      await createChild({
        parentId: parentProfile._id,
        alias,
        age: parseInt(age),
        asdSeverityLevel: parseInt(asdSeverityLevel),
        verbalAbility,
        consentRecorded: true // Parent must consent by creating profile
      });

      // Fetch updated children list
      const children = await getParentChildren(parentProfile._id);
      setChildren(children);

      // Navigate back to ChildSelect - it will reload children via useFocusEffect
      navigation.navigate('ChildSelect');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('ChildSelect');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Child Profile</Text>
        <Text style={styles.subtitle}>Tell us about your child</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Child Name or Alias *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 'My Child' or 'StarFish'"
            placeholderTextColor="#C0A080"
            value={alias}
            onChangeText={setAlias}
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age *</Text>
          <TextInput
            style={styles.input}
            placeholder="3-18"
            placeholderTextColor="#C0A080"
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ASD Severity Level *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={asdSeverityLevel}
              onValueChange={(value) => setAsdSeverityLevel(value)}
              enabled={!loading}
              style={styles.picker}
            >
              <Picker.Item label="Level 1 - Mild" value={1} />
              <Picker.Item label="Level 2 - Moderate" value={2} />
              <Picker.Item label="Level 3 - Severe" value={3} />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Verbal Ability *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={verbalAbility}
              onValueChange={(value) => setVerbalAbility(value)}
              enabled={!loading}
              style={styles.picker}
            >
              <Picker.Item label="Non-verbal" value="non-verbal" />
              <Picker.Item label="Limited" value="limited" />
              <Picker.Item label="Verbal" value="verbal" />
            </Picker>
          </View>
        </View>

        <View style={styles.consentBox}>
          <Text style={styles.consentText}>
            By creating this profile, you confirm that you have obtained informed consent from parents/guardians and comply with all data protection regulations.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, loading && styles.buttonDisabled]}
          onPress={handleAddChild}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Child</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF5',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#3D2B1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
  },
  form: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5A3E28',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D4C4B0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#3D2B1F',
    backgroundColor: '#FAFAF8',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D4C4B0',
    borderRadius: 8,
    backgroundColor: '#FAFAF8',
    overflow: 'hidden',
  },
  picker: {
    color: '#3D2B1F',
  },
  consentBox: {
    backgroundColor: '#E8F4F8',
    borderLeftWidth: 4,
    borderLeftColor: '#378ADD',
    padding: 12,
    borderRadius: 4,
    marginBottom: 24,
  },
  consentText: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  skipButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4C4B0',
  },
  skipButtonText: {
    color: '#8B7355',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
