import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Contact {
  id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

interface SupplierContactsModalProps {
  open: boolean;
  onClose: () => void;
  supplierId: string;
  contacts: Contact[];
}

// 유효성 검증 함수들
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone: string): boolean => {
  // 국내 전화번호 및 국제 전화번호 지원
  const phonePatterns = [
    /^\d{2,3}-\d{3,4}-\d{4}$/, // 국내 전화번호
    /^\+\d{1,4}-\d{1,4}-\d{4,}$/, // 국제 전화번호
  ];
  return phonePatterns.some(pattern => pattern.test(phone));
};

const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // 국제 전화번호
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.match(/^\+(\d{1,4})/)?.[1] || '';
    const remaining = cleaned.slice(countryCode.length + 1);
    if (remaining.length >= 8) {
      return `+${countryCode}-${remaining.slice(0, -4)}-${remaining.slice(-4)}`;
    }
    return phone;
  }
  
  // 국내 전화번호
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  return phone;
};

const SupplierContactsModal: React.FC<SupplierContactsModalProps> = ({
  open,
  onClose,
  supplierId,
  contacts: initialContacts,
}) => {
  const queryClient = useQueryClient();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContact, setNewContact] = useState<Partial<Contact> | null>(null);
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});

  // 연락처 업데이트 mutation
  const updateMutation = useMutation(
    async (updatedContacts: Contact[]) => {
      const response = await fetch(`/api/v1/maintenance/suppliers/${supplierId}/contacts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contacts: updatedContacts }),
      });
      if (!response.ok) throw new Error('연락처 업데이트에 실패했습니다.');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['suppliers']);
        onClose();
      },
    }
  );

  const handleAddContact = () => {
    setNewContact({
      name: '',
      position: '',
      phone: '',
      email: '',
      isPrimary: contacts.length === 0,
    });
  };

  const validateContact = (contact: Partial<Contact>): boolean => {
    const newErrors: typeof errors = {};

    if (!contact.name?.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (contact.phone) {
      if (!isValidPhone(contact.phone)) {
        newErrors.phone = '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678 또는 +82-10-1234-5678)';
      } else if (contacts.some(c => c.phone === contact.phone)) {
        newErrors.phone = '이미 등록된 전화번호입니다.';
      }
    } else {
      newErrors.phone = '전화번호를 입력해주세요.';
    }

    if (contact.email) {
      if (!isValidEmail(contact.email)) {
        newErrors.email = '올바른 이메일 형식이 아닙니다.';
      } else if (contacts.some(c => c.email === contact.email)) {
        newErrors.email = '이미 등록된 이메일입니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveNewContact = () => {
    if (newContact && validateContact(newContact)) {
      const formattedContact = {
        ...newContact,
        phone: formatPhoneNumber(newContact.phone || ''),
      };
      const newId = `temp-${Date.now()}`;
      setContacts([...contacts, { ...formattedContact, id: newId } as Contact]);
      setNewContact(null);
      setErrors({});
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleSaveEdit = () => {
    if (editingContact) {
      setContacts(contacts.map(c => c.id === editingContact.id ? editingContact : c));
      setEditingContact(null);
    }
  };

  const handleDeleteContact = (contactId: string) => {
    setContacts(contacts.filter(c => c.id !== contactId));
  };

  const handleSetPrimary = (contactId: string) => {
    const currentPrimary = contacts.find(c => c.isPrimary);
    if (currentPrimary && currentPrimary.id !== contactId) {
      if (window.confirm('주 담당자를 변경하시겠습니까?')) {
        setContacts(contacts.map(c => ({
          ...c,
          isPrimary: c.id === contactId,
        })));
      }
    } else if (!currentPrimary) {
      setContacts(contacts.map(c => ({
        ...c,
        isPrimary: c.id === contactId,
      })));
    }
  };

  // 전화번호 입력 시 자동 포맷팅
  const handlePhoneChange = (value: string, isNew: boolean = false) => {
    const formatted = formatPhoneNumber(value);
    if (isNew && newContact) {
      setNewContact({ ...newContact, phone: formatted });
    } else if (editingContact) {
      setEditingContact({ ...editingContact, phone: formatted });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>연락처 관리</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">
            총 {contacts.length}개의 연락처
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddContact}
            disabled={!!newContact}
          >
            연락처 추가
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>이름</TableCell>
                <TableCell>직책</TableCell>
                <TableCell>연락처</TableCell>
                <TableCell>이메일</TableCell>
                <TableCell>주 담당자</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {newContact && (
                <TableRow>
                  <TableCell>
                    <TextField
                      size="small"
                      value={newContact.name || ''}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      placeholder="이름"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={newContact.position || ''}
                      onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                      placeholder="직책"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={newContact.phone || ''}
                      onChange={(e) => handlePhoneChange(e.target.value, true)}
                      placeholder="전화번호"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={newContact.email || ''}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      placeholder="이메일"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {contacts.length === 0 && '주 담당자'}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <IconButton size="small" color="primary" onClick={handleSaveNewContact}>
                        <SaveIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setNewContact(null)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              )}

              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  {editingContact?.id === contact.id ? (
                    <>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editingContact.name}
                          onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editingContact.position}
                          onChange={(e) => setEditingContact({ ...editingContact, position: e.target.value })}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editingContact.phone}
                          onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={editingContact.email}
                          onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="center">
                        {contact.isPrimary && '주 담당자'}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <IconButton size="small" color="primary" onClick={handleSaveEdit}>
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => setEditingContact(null)}>
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{contact.name}</TableCell>
                      <TableCell>{contact.position}</TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant={contact.isPrimary ? "contained" : "outlined"}
                          onClick={() => handleSetPrimary(contact.id)}
                          disabled={contact.isPrimary}
                        >
                          {contact.isPrimary ? '주 담당자' : '주 담당자로 지정'}
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <IconButton size="small" onClick={() => handleEditContact(contact)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteContact(contact.id)}
                            disabled={contact.isPrimary}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          onClick={() => updateMutation.mutate(contacts)}
          disabled={updateMutation.isLoading}
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupplierContactsModal; 