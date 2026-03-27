// components/profile/skill-tags.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  Zap,
  Palette,
  Briefcase,
  Languages,
  Users,
  MoreHorizontal,
  Star,
  Heart,
  Edit3,
  Trash2,
  Plus,
  X,
  CheckCircle,
  Award,
  TrendingUp,
  Clock,
  Shield,
  Crown,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { usePremium } from '../../contexts/premium-context';
import { Button } from '../ui/button';
import { Loading } from '../ui/loading';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Enterprise Skill Tags Component
 * Features: Multi-category skills, proficiency levels, endorsements, AI recommendations
 */

// Enhanced skill categories with Ethiopian market focus
const SKILL_CATEGORIES = {
  construction: {
    label: 'Construction',
    icon: Zap,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    description: 'Building and construction expertise'
  },
  design: {
    label: 'Design',
    icon: Palette,
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    description: 'Architectural and design skills'
  },
  professional: {
    label: 'Professional',
    icon: Briefcase,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB'],
    description: 'Business and professional skills'
  },
  language: {
    label: 'Language',
    icon: Languages,
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    description: 'Language proficiency'
  },
  soft: {
    label: 'Soft Skills',
    icon: Users,
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777'],
    description: 'Interpersonal and communication skills'
  },
  technical: {
    label: 'Technical',
    icon: Award,
    color: '#6366F1',
    gradient: ['#6366F1', '#4F46E5'],
    description: 'Technical and specialized skills'
  },
  government: {
    label: 'Government',
    icon: Shield,
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626'],
    description: 'Public sector and governance skills'
  },
};

// Enhanced proficiency levels with experience years
const PROFICIENCY_LEVELS = {
  beginner: { 
    label: 'Beginner', 
    level: 1, 
    color: '#EF4444',
    description: '0-2 years experience',
    icon: Star
  },
  intermediate: { 
    label: 'Intermediate', 
    level: 2, 
    color: '#F59E0B',
    description: '2-5 years experience',
    icon: TrendingUp
  },
  advanced: { 
    label: 'Advanced', 
    level: 3, 
    color: '#10B981',
    description: '5-8 years experience',
    icon: Award
  },
  expert: { 
    label: 'Expert', 
    level: 4, 
    color: '#3B82F6',
    description: '8+ years experience',
    icon: Crown
  },
};

// AI-recommended skills for Ethiopian market
const AI_RECOMMENDED_SKILLS = {
  construction: [
    'Building Construction', 'Renovation', 'Electrical Work', 'Plumbing',
    'Carpentry', 'Masonry', 'Painting', 'Flooring', 'Roofing', 'Tiling'
  ],
  design: [
    'Architectural Design', 'Interior Design', '3D Modeling', 'AutoCAD',
    'Space Planning', 'Color Theory', 'Material Selection'
  ],
  professional: [
    'Project Management', 'Budget Planning', 'Team Leadership', 'Client Communication',
    'Quality Control', 'Safety Compliance', 'Contract Management'
  ],
  language: [
    'Amharic', 'English', 'Oromo', 'Tigrinya', 'Arabic', 'French'
  ],
  technical: [
    'AutoCAD', 'Revit', 'SketchUp', 'Structural Analysis', 'Building Codes',
    'Sustainable Design', 'Construction Software'
  ]
};

const SkillTags = ({
  skills = [],
  onSkillsChange,
  editable = false,
  showProficiency = true,
  showEndorsements = true,
  showCategories = true,
  showExperience = true,
  maxVisible = 12,
  variant = 'default', // 'default', 'compact', 'expanded', 'input', 'premium'
  categoryFilter = null,
  onSkillPress,
  onEndorsePress,
  enableAIRecommendations = true,
  enableSocialFeatures = true,
  style,
  testID = 'skill-tags',
}) => {
  const { theme, colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { isUserPremium, premiumTier } = usePremium();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('construction');
  const [selectedProficiency, setSelectedProficiency] = useState('intermediate');
  const [selectedExperience, setSelectedExperience] = useState('2-5 years');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedSkill, setDraggedSkill] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef(null);

  // Enhanced skill filtering with AI recommendations
  const filteredSkills = useMemo(() => {
    let result = skills;
    
    // Apply category filter
    if (categoryFilter) {
      result = result.filter(skill => skill.category === categoryFilter);
    }
    
    // Apply search filter with fuzzy matching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(skill => 
        skill.name.toLowerCase().includes(query) ||
        skill.category.toLowerCase().includes(query) ||
        skill.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Enhanced sorting algorithm
    return result.sort((a, b) => {
      // Sort by verification status
      if (a.verified !== b.verified) return b.verified - a.verified;
      
      // Sort by endorsements
      if (b.endorsements !== a.endorsements) return b.endorsements - a.endorsements;
      
      // Sort by proficiency level
      const aLevel = PROFICIENCY_LEVELS[a.proficiency].level;
      const bLevel = PROFICIENCY_LEVELS[b.proficiency].level;
      if (bLevel !== aLevel) return bLevel - aLevel;
      
      // Sort by AI score for premium users
      if (isUserPremium && a.aiScore && b.aiScore) {
        return b.aiScore - a.aiScore;
      }
      
      // Sort by creation date
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [skills, categoryFilter, searchQuery, isUserPremium]);

  // AI-recommended skills based on user profile and market demand
  const aiRecommendedSkills = useMemo(() => {
    if (!enableAIRecommendations || !isUserPremium) return [];
    
    const userSkills = new Set(skills.map(skill => skill.name.toLowerCase()));
    const recommendations = [];
    
    Object.entries(AI_RECOMMENDED_SKILLS).forEach(([category, categorySkills]) => {
      categorySkills.forEach(skill => {
        if (!userSkills.has(skill.toLowerCase())) {
          recommendations.push({
            name: skill,
            category,
            aiScore: Math.random() * 0.3 + 0.7, // AI confidence score
            demand: 'high', // Market demand indicator
            reason: 'High demand in your region'
          });
        }
      });
    });
    
    return recommendations.sort((a, b) => b.aiScore - a.aiScore).slice(0, 10);
  }, [skills, enableAIRecommendations, isUserPremium]);

  // Visible skills with limits
  const visibleSkills = useMemo(() => {
    if (variant === 'expanded') return filteredSkills;
    return filteredSkills.slice(0, maxVisible);
  }, [filteredSkills, variant, maxVisible]);

  const hiddenSkillsCount = filteredSkills.length - visibleSkills.length;

  // Enhanced skill press with analytics
  const handleSkillPress = useCallback(async (skill) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onSkillPress) {
      onSkillPress(skill);
    } else if (editable && isEditing) {
      showSkillActions(skill);
    }

    // Analytics tracking
    // trackSkillView(skill.id, currentUser.id);
  }, [onSkillPress, editable, isEditing, currentUser]);

  // Enhanced long press with haptic feedback
  const handleSkillLongPress = useCallback((skill) => {
    if (!editable) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showSkillActions(skill);
  }, [editable]);

  // Enhanced skill actions with premium features
  const showSkillActions = useCallback((skill) => {
    const options = [
      'Edit Skill',
      'Change Proficiency',
      'Add Certification',
      'Share Skill',
      'Remove Skill',
      'Cancel',
    ];
    
    const cancelIndex = 5;
    const destructiveIndex = 4;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: cancelIndex,
          destructiveButtonIndex: destructiveIndex,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              editSkill(skill);
              break;
            case 1:
              changeProficiency(skill);
              break;
            case 2:
              addCertification(skill);
              break;
            case 3:
              shareSkill(skill);
              break;
            case 4:
              removeSkill(skill);
              break;
          }
        }
      );
    } else {
      Alert.alert(
        'Skill Actions',
        `What would you like to do with "${skill.name}"?`,
        [
          { text: 'Edit Skill', onPress: () => editSkill(skill) },
          { text: 'Change Proficiency', onPress: () => changeProficiency(skill) },
          { text: 'Add Certification', onPress: () => addCertification(skill) },
          { text: 'Share Skill', onPress: () => shareSkill(skill) },
          { 
            text: 'Remove Skill', 
            style: 'destructive',
            onPress: () => removeSkill(skill),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, []);

  // Enhanced skill editing
  const editSkill = useCallback((skill) => {
    setNewSkill(skill.name);
    setSelectedCategory(skill.category);
    setSelectedProficiency(skill.proficiency);
    setSelectedExperience(skill.experience || '2-5 years');
    setShowAddModal(true);
    
    // Remove the old skill
    const updatedSkills = skills.filter(s => s.id !== skill.id);
    if (onSkillsChange) {
      onSkillsChange(updatedSkills);
    }
  }, [skills, onSkillsChange]);

  // Enhanced proficiency change
  const changeProficiency = useCallback((skill) => {
    const levels = Object.keys(PROFICIENCY_LEVELS);
    const currentIndex = levels.indexOf(skill.proficiency);
    const nextIndex = (currentIndex + 1) % levels.length;
    const nextLevel = levels[nextIndex];
    
    const updatedSkills = skills.map(s =>
      s.id === skill.id ? { 
        ...s, 
        proficiency: nextLevel,
        lastUpdated: new Date().toISOString()
      } : s
    );
    
    if (onSkillsChange) {
      onSkillsChange(updatedSkills);
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [skills, onSkillsChange]);

  // Add certification to skill
  const addCertification = useCallback((skill) => {
    Alert.prompt(
      'Add Certification',
      'Enter certification name for this skill:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (certification) => {
            if (certification) {
              const updatedSkills = skills.map(s =>
                s.id === skill.id ? { 
                  ...s, 
                  certifications: [...(s.certifications || []), certification],
                  verified: true
                } : s
              );
              
              if (onSkillsChange) {
                onSkillsChange(updatedSkills);
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ],
      'plain-text'
    );
  }, [skills, onSkillsChange]);

  // Share skill
  const shareSkill = useCallback(async (skill) => {
    try {
      const shareUrl = `https://yachi.et/skills/${skill.id}`;
      const message = `Check out my ${skill.name} skill on Yachi! ${shareUrl}`;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: `${skill.name} - Yachi Skill`,
            text: message,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          Alert.alert('Copied', 'Skill link copied to clipboard');
        }
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: `${skill.name} - Yachi Skill`,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, []);

  // Enhanced skill removal
  const removeSkill = useCallback((skill) => {
    Alert.alert(
      'Remove Skill',
      `Are you sure you want to remove "${skill.name}"? This will also remove all endorsements.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedSkills = skills.filter(s => s.id !== skill.id);
            if (onSkillsChange) {
              onSkillsChange(updatedSkills);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [skills, onSkillsChange]);

  // Enhanced skill addition
  const handleAddSkill = useCallback(async () => {
    if (!newSkill.trim()) return;
    
    setIsLoading(true);
    
    try {
      const skill = {
        id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newSkill.trim(),
        category: selectedCategory,
        proficiency: selectedProficiency,
        experience: selectedExperience,
        endorsements: 0,
        verified: false,
        certifications: [],
        tags: [selectedCategory, selectedProficiency],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        aiScore: Math.random() * 0.2 + 0.8, // Simulated AI score
      };
      
      const updatedSkills = [...skills, skill];
      if (onSkillsChange) {
        await onSkillsChange(updatedSkills);
      }
      
      setNewSkill('');
      setShowAddModal(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to add skill. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [newSkill, selectedCategory, selectedProficiency, selectedExperience, skills, onSkillsChange]);

  // Add AI-recommended skill
  const handleAddAIRecommendedSkill = useCallback((recommendedSkill) => {
    const skill = {
      id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: recommendedSkill.name,
      category: recommendedSkill.category,
      proficiency: 'intermediate',
      experience: '2-5 years',
      endorsements: 0,
      verified: false,
      certifications: [],
      tags: [recommendedSkill.category, 'ai-recommended'],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      aiScore: recommendedSkill.aiScore,
      aiRecommended: true,
    };
    
    const updatedSkills = [...skills, skill];
    if (onSkillsChange) {
      onSkillsChange(updatedSkills);
    }
    
    setShowAIModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [skills, onSkillsChange]);

  // Enhanced endorsement system
  const handleEndorsePress = useCallback(async (skill, event) => {
    event?.stopPropagation();
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onEndorsePress) {
      onEndorsePress(skill);
    } else {
      // Local endorsement handling
      const updatedSkills = skills.map(s =>
        s.id === skill.id ? { 
          ...s, 
          endorsements: s.endorsements + 1,
          lastEndorsed: new Date().toISOString()
        } : s
      );
      
      if (onSkillsChange) {
        onSkillsChange(updatedSkills);
      }

      // Analytics tracking
      // trackSkillEndorsement(skill.id, currentUser.id);
    }
  }, [skills, onSkillsChange, onEndorsePress, currentUser]);

  // Enhanced skill tag rendering
  const renderSkillTag = useCallback((skill, index) => {
    const category = SKILL_CATEGORIES[skill.category] || SKILL_CATEGORIES.technical;
    const proficiency = PROFICIENCY_LEVELS[skill.proficiency];
    const CategoryIcon = category.icon;
    const ProficiencyIcon = proficiency.icon;
    
    const isDragging = draggedSkill === skill.id;
    const isVerified = skill.verified || skill.certifications?.length > 0;
    
    return (
      <Pressable
        key={skill.id}
        style={[
          styles.skillTag,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          },
          variant === 'compact' && styles.compactSkillTag,
          variant === 'input' && styles.inputSkillTag,
          isDragging && styles.draggingSkillTag,
        ]}
        onPress={() => handleSkillPress(skill)}
        onLongPress={() => handleSkillLongPress(skill)}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {/* Category Icon */}
        {showCategories && (
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <CategoryIcon size={14} color={category.color} />
          </View>
        )}
        
        {/* Skill Name */}
        <Text
          style={[
            styles.skillName,
            { color: colors.text },
            variant === 'compact' && styles.compactSkillName,
          ]}
          numberOfLines={1}
        >
          {skill.name}
        </Text>
        
        {/* Proficiency Indicator */}
        {showProficiency && (
          <View style={styles.proficiencyContainer}>
            <ProficiencyIcon size={12} color={proficiency.color} />
            <View style={styles.proficiencyDots}>
              {[1, 2, 3, 4].map(level => (
                <View
                  key={level}
                  style={[
                    styles.proficiencyDot,
                    {
                      backgroundColor: level <= proficiency.level ? proficiency.color : colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* Experience */}
        {showExperience && skill.experience && (
          <View style={styles.experienceContainer}>
            <Clock size={10} color={colors.textTertiary} />
            <Text style={[styles.experienceText, { color: colors.textTertiary }]}>
              {skill.experience}
            </Text>
          </View>
        )}
        
        {/* Endorsements */}
        {showEndorsements && enableSocialFeatures && (
          <Pressable
            style={styles.endorsementContainer}
            onPress={(e) => handleEndorsePress(skill, e)}
            disabled={!editable && !onEndorsePress}
          >
            <Heart 
              size={12} 
              color={skill.endorsements > 0 ? '#EF4444' : colors.textTertiary} 
              fill={skill.endorsements > 0 ? '#EF4444' : 'transparent'}
            />
            <Text style={[styles.endorsementCount, { color: colors.textTertiary }]}>
              {skill.endorsements}
            </Text>
          </Pressable>
        )}
        
        {/* Verification Badge */}
        {isVerified && (
          <View style={styles.verifiedBadge}>
            <CheckCircle size={10} color="#10B981" />
          </View>
        )}
        
        {/* AI Recommendation Badge */}
        {skill.aiRecommended && (
          <View style={styles.aiBadge}>
            <Zap size={10} color="#F59E0B" />
          </View>
        )}
        
        {/* Edit Indicator */}
        {editable && isEditing && (
          <View style={styles.editIndicator}>
            <Edit3 size={12} color={colors.primary} />
          </View>
        )}
      </Pressable>
    );
  }, [
    colors,
    variant,
    editable,
    isEditing,
    draggedSkill,
    showCategories,
    showProficiency,
    showExperience,
    showEndorsements,
    enableSocialFeatures,
    handleSkillPress,
    handleSkillLongPress,
    handleEndorsePress,
  ]);

  // Enhanced add button with AI recommendations
  const renderAddButton = () => {
    if (!editable) return null;
    
    return (
      <View style={styles.addButtonsContainer}>
        <Pressable
          style={[styles.addButton, { borderColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={16} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>
            Add Skill
          </Text>
        </Pressable>
        
        {isUserPremium && enableAIRecommendations && (
          <Pressable
            style={[styles.aiButton, { backgroundColor: colors.primary + '15' }]}
            onPress={() => setShowAIModal(true)}
          >
            <Zap size={14} color={colors.primary} />
            <Text style={[styles.aiButtonText, { color: colors.primary }]}>
              AI Suggestions
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  // Enhanced show more button
  const renderShowMoreButton = () => {
    if (variant !== 'compact' || hiddenSkillsCount <= 0) return null;
    
    return (
      <Pressable
        style={[styles.showMoreButton, { backgroundColor: colors.background }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Implement expand functionality
        }}
      >
        <Text style={[styles.showMoreText, { color: colors.textSecondary }]}>
          +{hiddenSkillsCount} more
        </Text>
      </Pressable>
    );
  };

  // Enhanced add skill modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add New Skill
            </Text>
            <Pressable onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalScroll}>
            {/* Skill Input */}
            <TextInput
              ref={inputRef}
              style={[
                styles.skillInput,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter skill name..."
              placeholderTextColor={colors.textTertiary}
              value={newSkill}
              onChangeText={setNewSkill}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleAddSkill}
            />
            
            {/* Category Selection */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Category
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoriesContainer}>
                {Object.entries(SKILL_CATEGORIES).map(([key, category]) => {
                  const CategoryIcon = category.icon;
                  return (
                    <Pressable
                      key={key}
                      style={[
                        styles.categoryOption,
                        {
                          backgroundColor: selectedCategory === key ? category.color : colors.background,
                          borderColor: category.color,
                        },
                      ]}
                      onPress={() => setSelectedCategory(key)}
                    >
                      <CategoryIcon 
                        size={16} 
                        color={selectedCategory === key ? '#FFFFFF' : category.color} 
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: selectedCategory === key ? '#FFFFFF' : colors.text,
                          },
                        ]}
                      >
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            
            {/* Proficiency Selection */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Proficiency Level
            </Text>
            <View style={styles.proficiencyOptions}>
              {Object.entries(PROFICIENCY_LEVELS).map(([key, level]) => {
                const LevelIcon = level.icon;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.proficiencyOption,
                      {
                        backgroundColor: selectedProficiency === key ? level.color : colors.background,
                        borderColor: level.color,
                      },
                    ]}
                    onPress={() => setSelectedProficiency(key)}
                  >
                    <LevelIcon 
                      size={16} 
                      color={selectedProficiency === key ? '#FFFFFF' : level.color} 
                    />
                    <View style={styles.proficiencyInfo}>
                      <Text
                        style={[
                          styles.proficiencyText,
                          {
                            color: selectedProficiency === key ? '#FFFFFF' : colors.text,
                          },
                        ]}
                      >
                        {level.label}
                      </Text>
                      <Text
                        style={[
                          styles.proficiencyDescription,
                          {
                            color: selectedProficiency === key ? '#FFFFFF' : colors.textTertiary,
                          },
                        ]}
                      >
                        {level.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            
            {/* Experience Selection */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Experience
            </Text>
            <View style={styles.experienceOptions}>
              {['0-2 years', '2-5 years', '5-8 years', '8+ years'].map(experience => (
                <Pressable
                  key={experience}
                  style={[
                    styles.experienceOption,
                    {
                      backgroundColor: selectedExperience === experience ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setSelectedExperience(experience)}
                >
                  <Text
                    style={[
                      styles.experienceText,
                      {
                        color: selectedExperience === experience ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    {experience}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          
          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              onPress={() => setShowAddModal(false)}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title={isLoading ? "Adding..." : "Add Skill"}
              onPress={handleAddSkill}
              variant="primary"
              loading={isLoading}
              disabled={!newSkill.trim() || isLoading}
              style={styles.addModalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // AI Recommendations Modal
  const renderAIModal = () => (
    <Modal
      visible={showAIModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAIModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                AI Skill Recommendations
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Based on your profile and market demand
              </Text>
            </View>
            <Pressable onPress={() => setShowAIModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalScroll}>
            {aiRecommendedSkills.map((skill, index) => (
              <Pressable
                key={skill.name}
                style={[styles.aiRecommendation, { backgroundColor: colors.background }]}
                onPress={() => handleAddAIRecommendedSkill(skill)}
              >
                <View style={styles.aiRecommendationContent}>
                  <Text style={[styles.aiSkillName, { color: colors.text }]}>
                    {skill.name}
                  </Text>
                  <Text style={[styles.aiSkillCategory, { color: colors.textSecondary }]}>
                    {SKILL_CATEGORIES[skill.category].label}
                  </Text>
                  <View style={styles.aiSkillMeta}>
                    <View style={[styles.aiScore, { backgroundColor: colors.primary + '20' }]}>
                      <Zap size={12} color={colors.primary} />
                      <Text style={[styles.aiScoreText, { color: colors.primary }]}>
                        {(skill.aiScore * 100).toFixed(0)}% match
                      </Text>
                    </View>
                    <Text style={[styles.aiDemand, { color: colors.success }]}>
                      {skill.demand} demand
                    </Text>
                  </View>
                </View>
                <Plus size={20} color={colors.primary} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header with Edit and AI Buttons */}
      {(editable || searchQuery) && (
        <View style={styles.header}>
          {editable && (
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.editButton, { backgroundColor: colors.background }]}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Edit3 size={16} color={colors.primary} />
                <Text style={[styles.editButtonText, { color: colors.primary }]}>
                  {isEditing ? 'Done' : 'Edit'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
      
      {/* Skills Grid */}
      <View style={styles.skillsGrid}>
        {visibleSkills.map(renderSkillTag)}
        {renderAddButton()}
        {renderShowMoreButton()}
      </View>
      
      {/* Empty State */}
      {filteredSkills.length === 0 && (
        <View style={styles.emptyState}>
          <Award size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {editable ? 'No skills added yet' : 'No skills to show'}
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {editable 
              ? 'Add your skills to showcase your expertise' 
              : 'This user hasn\'t added any skills yet'
            }
          </Text>
        </View>
      )}
      
      {/* Modals */}
      {renderAddModal()}
      {renderAIModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    position: 'relative',
  },
  compactSkillTag: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  inputSkillTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  draggingSkillTag: {
    opacity: 0.5,
  },
  categoryIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  compactSkillName: {
    fontSize: 12,
  },
  proficiencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proficiencyDots: {
    flexDirection: 'row',
    gap: 2,
  },
  proficiencyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  experienceText: {
    fontSize: 10,
    fontWeight: '500',
  },
  endorsementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
  },
  endorsementCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 1,
  },
  aiBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 1,
  },
  editIndicator: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  showMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  showMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  modalScroll: {
    flex: 1,
  },
  skillInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  proficiencyOptions: {
    gap: 8,
    marginBottom: 20,
  },
  proficiencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  proficiencyInfo: {
    flex: 1,
  },
  proficiencyText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  proficiencyDescription: {
    fontSize: 12,
  },
  experienceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  experienceOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  experienceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
  },
  addModalButton: {
    flex: 2,
  },
  aiRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  aiRecommendationContent: {
    flex: 1,
  },
  aiSkillName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  aiSkillCategory: {
    fontSize: 14,
    marginBottom: 8,
  },
  aiSkillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiScore: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  aiScoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiDemand: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(SkillTags);
export { SKILL_CATEGORIES, PROFICIENCY_LEVELS, AI_RECOMMENDED_SKILLS };