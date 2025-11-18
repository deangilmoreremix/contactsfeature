import React, { useState, useCallback, useEffect } from 'react';
import { Contact } from '../types/contact';
import { contactService } from '../services/contactService';

interface UseContactEditingProps {
  contact: Contact;
  onUpdate?: ((id: string, updates: Partial<Contact>) => Promise<Contact>) | undefined;
}

export const useContactEditing = ({ contact, onUpdate }: UseContactEditingProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact>(contact);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [selectedSocialPlatform, setSelectedSocialPlatform] = useState('');
  const [socialFieldValue, setSocialFieldValue] = useState('');
  const [showAddSource, setShowAddSource] = useState(false);
  const [addSource, setAddSource] = useState('');
  const [editInterestLevel, setEditInterestLevel] = useState(false);

  // Reset edited contact when contact changes
  React.useEffect(() => {
    setEditedContact(contact);
  }, [contact]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Validate contact data first
      const validation = contactService.validateContactData(editedContact);
      if (!validation.isValid) {
        alert(`Validation errors:\n${validation.errors.join('\n')}`);
        return;
      }

      // Save to database
      const updated = await contactService.updateContact(contact.id, editedContact);
      setEditedContact(updated);

      // Log activity
      await contactService.addContactActivity(
        contact.id,
        'contact_updated',
        'Contact information updated',
        { fieldsChanged: Object.keys(editedContact) }
      );

      setIsEditing(false);
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update contact:', error);
      alert('Failed to save contact. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [editedContact, contact.id]);

  const handleCancel = useCallback(() => {
    setEditedContact(contact);
    setIsEditing(false);
    setShowAddField(false);
    setNewFieldName('');
    setNewFieldValue('');
    setEditingField(null);
  }, [contact]);

  const handleEditField = useCallback((field: string, value: any) => {
    setEditedContact(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleStartEditingField = useCallback((field: string) => {
    setEditingField(field);
  }, []);

  const handleSaveField = useCallback(async () => {
    if (editingField) {
      try {
        let updates: Partial<Contact> = {};

        if (editingField.startsWith('social_')) {
          const socialProfiles = {
            ...(editedContact.socialProfiles || {}),
          };
          updates = { socialProfiles };
        } else if (editingField.startsWith('custom_')) {
          const customFields = {
            ...(editedContact.customFields || {}),
          };
          updates = { customFields };
        } else {
          const fieldValue = editedContact[editingField as keyof Contact];
          updates = { [editingField]: fieldValue };
        }

        await contactService.updateContact(contact.id, updates);

        // Log activity
        await contactService.addContactActivity(
          contact.id,
          'field_updated',
          `Updated ${editingField}`,
          { field: editingField, oldValue: contact[editingField as keyof Contact], newValue: updates[editingField as keyof Contact] }
        );

        setEditingField(null);
      } catch (error) {
        console.error('Failed to update field:', error);
        alert('Failed to save field. Please try again.');
      }
    }
  }, [editingField, editedContact, contact]);

  const handleAddCustomField = useCallback(async () => {
    if (newFieldName && newFieldValue) {
      const customFields = {
        ...(editedContact.customFields || {}),
        [newFieldName]: newFieldValue
      };

      setEditedContact(prev => ({
        ...prev,
        customFields
      }));

      try {
        await contactService.updateContact(contact.id, { customFields });

        // Log activity
        await contactService.addContactActivity(
          contact.id,
          'custom_field_added',
          `Added custom field: ${newFieldName}`,
          { fieldName: newFieldName, fieldValue: newFieldValue }
        );

        setNewFieldName('');
        setNewFieldValue('');
        setShowAddField(false);
      } catch (error) {
        console.error('Failed to add custom field:', error);
        alert('Failed to add custom field. Please try again.');
      }
    }
  }, [newFieldName, newFieldValue, editedContact, contact.id]);

  const handleRemoveCustomField = useCallback(async (fieldName: string) => {
    const customFields = { ...(editedContact.customFields || {}) };
    if (!customFields) return;

    delete customFields[fieldName];

    setEditedContact(prev => ({
      ...prev,
      customFields
    }));

    if (onUpdate) {
      try {
        await onUpdate(contact.id, { customFields });
      } catch (error) {
        console.error('Failed to remove custom field:', error);
      }
    }
  }, [editedContact, contact.id, onUpdate]);

  const handleToggleFavorite = useCallback(async () => {
    const updatedContact = { ...editedContact, isFavorite: !editedContact.isFavorite };
    setEditedContact(updatedContact);

    if (onUpdate) {
      try {
        await onUpdate(contact.id, { isFavorite: updatedContact.isFavorite });
      } catch (error) {
        console.error('Failed to update favorite status:', error);
        // Revert on error
        setEditedContact(prev => ({ ...prev, isFavorite: !updatedContact.isFavorite }));
      }
    }
  }, [editedContact, contact.id, onUpdate]);

  const handleAddSocialProfile = useCallback(() => {
    if (selectedSocialPlatform && socialFieldValue) {
      const socialProfiles = {
        ...(editedContact.socialProfiles || {}),
        [selectedSocialPlatform]: socialFieldValue
      };

      setEditedContact(prev => ({
        ...prev,
        socialProfiles
      }));

      if (onUpdate) {
        onUpdate(contact.id, { socialProfiles })
          .catch(error => console.error('Failed to add social profile:', error));
      }

      setShowAddSocial(false);
      setSelectedSocialPlatform('');
      setSocialFieldValue('');
    }
  }, [selectedSocialPlatform, socialFieldValue, editedContact, contact.id, onUpdate]);

  const handleAddSourceToContact = useCallback(() => {
    if (addSource && !editedContact.sources.includes(addSource)) {
      const sources = [...editedContact.sources, addSource];

      setEditedContact(prev => ({
        ...prev,
        sources
      }));

      if (onUpdate) {
        onUpdate(contact.id, { sources })
          .catch(error => console.error('Failed to add source:', error));
      }

      setShowAddSource(false);
      setAddSource('');
    }
  }, [addSource, editedContact, contact.id, onUpdate]);

  const handleRemoveSource = useCallback(async (source: string) => {
    const sources = editedContact.sources.filter(s => s !== source);

    setEditedContact(prev => ({
      ...prev,
      sources
    }));

    if (onUpdate) {
      try {
        await onUpdate(contact.id, { sources });
      } catch (error) {
        console.error('Failed to remove source:', error);
      }
    }
  }, [editedContact, contact.id, onUpdate]);

  const handleChangeInterestLevel = useCallback(async (level: 'hot' | 'medium' | 'low' | 'cold') => {
    setEditedContact(prev => ({
      ...prev,
      interestLevel: level
    }));

    if (onUpdate) {
      try {
        await onUpdate(contact.id, { interestLevel: level });
        setEditInterestLevel(false);
      } catch (error) {
        console.error('Failed to update interest level:', error);
        setEditedContact(prev => ({ ...prev, interestLevel: contact.interestLevel }));
      }
    }
  }, [contact.id, contact.interestLevel, onUpdate]);

  return {
    isEditing,
    setIsEditing,
    editedContact,
    setEditedContact,
    isSaving,
    editingField,
    setEditingField,
    showAddField,
    setShowAddField,
    newFieldName,
    setNewFieldName,
    newFieldValue,
    setNewFieldValue,
    showAddSocial,
    setShowAddSocial,
    selectedSocialPlatform,
    setSelectedSocialPlatform,
    socialFieldValue,
    setSocialFieldValue,
    showAddSource,
    setShowAddSource,
    addSource,
    setAddSource,
    editInterestLevel,
    setEditInterestLevel,
    handleSave,
    handleCancel,
    handleEditField,
    handleStartEditingField,
    handleSaveField,
    handleAddCustomField,
    handleRemoveCustomField,
    handleToggleFavorite,
    handleAddSocialProfile,
    handleAddSourceToContact,
    handleRemoveSource,
    handleChangeInterestLevel,
  };
};