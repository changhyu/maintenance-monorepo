import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Rating,
  TextField,
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierRatingService } from '../../services/supplierRatingService';
import { ApiError } from '../../services/supplierRatingService';

interface RatingCriteria {
  quality: number;
  delivery: number;
  price: number;
  communication: number;
  support: number;
}

interface SupplierRating {
  id: string;
  supplierId: string;
  overallRating: number;
  criteria: RatingCriteria;
  review: string;
  recommendationLevel: 'highly' | 'moderately' | 'not';
  createdAt: string;
  createdBy: string;
}

interface SupplierRatingModalProps {
  open: boolean;
  onClose: () => void;
  supplierId: string;
  existingRating?: SupplierRating;
}

const INITIAL_CRITERIA: RatingCriteria = {
  quality: 0,
  delivery: 0,
  price: 0,
  communication: 0,
  support: 0,
};

const SupplierRatingModal: React.FC<SupplierRatingModalProps> = ({
  open,
  onClose,
  supplierId,
  existingRating,
}) => {
  const queryClient = useQueryClient();
  const [criteria, setCriteria] = useState<RatingCriteria>(INITIAL_CRITERIA);
  const [review, setReview] = useState('');
  const [recommendation, setRecommendation] = useState<'highly' | 'moderately' | 'not'>('moderately');

  useEffect(() => {
    if (open && existingRating) {
      setCriteria(existingRating.criteria);
      setReview(existingRating.review);
      setRecommendation(existingRating.recommendationLevel);
    }
  }, [open, existingRating]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!open) {
      timeoutId = setTimeout(() => {
        setCriteria(INITIAL_CRITERIA);
        setReview('');
        setRecommendation('moderately');
      }, 300);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [open]);

  const calculateOverallRating = (currentCriteria: RatingCriteria): number => {
    const values = Object.values(currentCriteria);
    return values.reduce((acc, val) => acc + val, 0) / values.length;
  };

  const ratingMutation = useMutation(
    async (rating: Omit<SupplierRating, 'id' | 'supplierId' | 'createdAt' | 'createdBy'>) => {
      try {
        if (existingRating) {
          return await supplierRatingService.updateRating(
            supplierId,
            existingRating.id,
            rating
          );
        }
        return await supplierRatingService.createRating(supplierId, rating);
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(`평가 저장에 실패했습니다: ${error.message} (코드: ${error.code})`);
        }
        throw new Error('평가 저장 중 알 수 없는 오류가 발생했습니다.');
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['suppliers', supplierId]);
        onClose();
      },
      onError: (error: Error) => {
        alert(error.message);
      },
    }
  );

  const handleSubmit = () => {
    const overallRating = calculateOverallRating(criteria);
    ratingMutation.mutate({
      supplierId,
      overallRating,
      criteria,
      review,
      recommendationLevel: recommendation,
    });
  };

  const handleCriteriaChange = (
    criteriaKey: keyof RatingCriteria,
    value: number | null
  ) => {
    setCriteria(prev => ({
      ...prev,
      [criteriaKey]: value || 0,
    }));
  };

  const criteriaLabels: Record<keyof RatingCriteria, string> = {
    quality: '품질',
    delivery: '배송',
    price: '가격',
    communication: '의사소통',
    support: '지원',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {existingRating ? '공급업체 평가 수정' : '공급업체 평가'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            평가 기준
          </Typography>
          {Object.entries(criteriaLabels).map(([key, label]) => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2,
                gap: 2,
              }}
            >
              <Typography sx={{ minWidth: 120 }}>{label}</Typography>
              <Rating
                value={criteria[key as keyof RatingCriteria]}
                onChange={(_, value) =>
                  handleCriteriaChange(key as keyof RatingCriteria, value)
                }
                precision={0.5}
              />
              <Typography sx={{ ml: 2 }}>
                {criteria[key as keyof RatingCriteria]}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            종합 평가
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography>평균 평점:</Typography>
            <Chip
              label={calculateOverallRating(criteria).toFixed(1)}
              color="primary"
            />
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend">추천 수준</FormLabel>
            <RadioGroup
              value={recommendation}
              onChange={(e) =>
                setRecommendation(e.target.value as 'highly' | 'moderately' | 'not')
              }
            >
              <FormControlLabel
                value="highly"
                control={<Radio />}
                label="적극 추천"
              />
              <FormControlLabel
                value="moderately"
                control={<Radio />}
                label="보통"
              />
              <FormControlLabel
                value="not"
                control={<Radio />}
                label="추천하지 않음"
              />
            </RadioGroup>
          </FormControl>
        </Box>

        <TextField
          label="상세 리뷰"
          multiline
          rows={4}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={ratingMutation.isLoading}
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupplierRatingModal; 