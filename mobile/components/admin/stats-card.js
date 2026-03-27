// components/admin/stats-card.js

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Path, Circle, G, Text as SvgText, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { analyticsService } from '../../services/analytics-service';

/**
 * Enhanced Stats Card Component for Ethiopian Market
 * 
 * Features:
 * - Ethiopian currency (ETB) and market-specific formatting
 * - AI construction project metrics
 * - Multi-role user statistics (Client, Service Provider, Government, Admin)
 * - Premium feature tracking (200 ETB/month)
 * - Ethiopian payment method analytics (Chapa, Telebirr, CBE Birr)
 * - Construction project progress tracking
 * - Government project metrics
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Chart types configuration with Ethiopian market icons
const CHART_TYPES = {
  line: {
    label: 'Line Chart',
    icon: 'show-chart',
  },
  bar: {
    label: 'Bar Chart',
    icon: 'bar-chart',
  },
  pie: {
    label: 'Pie Chart',
    icon: 'pie-chart',
  },
  donut: {
    label: 'Donut Chart',
    icon: 'donut-large',
  },
  progress: {
    label: 'Progress',
    icon: 'trending-up',
  },
  number: {
    label: 'Number',
    icon: 'tag',
  },
  construction: {
    label: 'Construction',
    icon: 'construct',
  },
  payment: {
    label: 'Payments',
    icon: 'cash',
  },
  users: {
    label: 'Users',
    icon: 'people',
  },
};

// Ethiopian market specific trend directions
const TREND_DIRECTIONS = {
  up: {
    color: '#10B981', // Ethiopian green
    icon: 'trending-up',
  },
  down: {
    color: '#EF4444',
    icon: 'trending-down',
  },
  neutral: {
    color: '#F59E0B', // Ethiopian yellow
    icon: 'remove',
  },
};

// Ethiopian payment methods
const PAYMENT_METHODS = {
  CHAPA: { color: '#3B82F6', name: 'Chapa' },
  TELEBIRR: { color: '#10B981', name: 'Telebirr' },
  CBE_BIRR: { color: '#F59E0B', name: 'CBE Birr' },
};

// User roles for Ethiopian market
const USER_ROLES = {
  CLIENT: { color: '#3B82F6', name: 'Clients', icon: 'person' },
  SERVICE_PROVIDER: { color: '#10B981', name: 'Service Providers', icon: 'construct' },
  GOVERNMENT: { color: '#8B5CF6', name: 'Government', icon: 'business' },
  ADMIN: { color: '#F59E0B', name: 'Admins', icon: 'shield' },
};

const StatsCard = ({
  title,
  value,
  subtitle,
  data = [],
  chartType = 'number',
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  color = '#10B981', // Default Ethiopian green
  gradient = ['#10B981', '#059669'], // Ethiopian green gradient
  trend = null,
  comparison = null,
  target = null,
  format = 'number', // 'number', 'percentage', 'currency', 'duration', 'etb'
  precision = 0,
  animationDuration = 1000,
  interactive = true,
  onPress,
  onLongPress,
  showTrend = true,
  showComparison = true,
  showTarget = false,
  compact = false,
  style,
  testID = 'stats-card',
  // Ethiopian market specific props
  paymentMethod = null,
  userRole = null,
  projectType = null,
  city = null,
  premium = false,
}) => {
  const { theme, isDark } = useTheme();
  
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const numberAnim = useRef(new Animated.Value(0)).current;

  // Size configurations
  const sizeConfig = useMemo(() => {
    const sizes = {
      small: {
        height: 120,
        padding: 16,
        titleSize: 14,
        valueSize: 24,
        subtitleSize: 12,
        iconSize: 20,
        chartHeight: 40,
      },
      medium: {
        height: 160,
        padding: 20,
        titleSize: 16,
        valueSize: 32,
        subtitleSize: 14,
        iconSize: 24,
        chartHeight: 60,
      },
      large: {
        height: 200,
        padding: 24,
        titleSize: 18,
        valueSize: 40,
        subtitleSize: 16,
        iconSize: 28,
        chartHeight: 80,
      },
      xlarge: {
        height: 240,
        padding: 28,
        titleSize: 20,
        valueSize: 48,
        subtitleSize: 18,
        iconSize: 32,
        chartHeight: 100,
      },
    };
    return sizes[size] || sizes.medium;
  }, [size]);

  // Format value based on format type with Ethiopian market support
  const formattedValue = useMemo(() => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    switch (format) {
      case 'percentage':
        return `${numValue.toFixed(precision)}%`;
      case 'currency':
        return `$${numValue.toFixed(precision).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
      case 'etb': // Ethiopian Birr
        return `ETB ${numValue.toFixed(precision).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
      case 'duration':
        if (numValue < 60) return `${numValue}s`;
        if (numValue < 3600) return `${Math.floor(numValue / 60)}m`;
        return `${Math.floor(numValue / 3600)}h`;
      case 'premium': // Premium subscriptions
        return `${numValue} active`;
      case 'projects': // Construction projects
        return `${numValue} projects`;
      default:
        return numValue.toLocaleString(undefined, {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        });
    }
  }, [value, format, precision]);

  // Calculate trend data for Ethiopian market
  const trendData = useMemo(() => {
    if (!trend) return null;
    
    const trendValue = typeof trend === 'object' ? trend.value : trend;
    const trendDirection = typeof trend === 'object' ? trend.direction : 
      trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral';
    
    return {
      value: Math.abs(trendValue),
      direction: trendDirection,
      ...TREND_DIRECTIONS[trendDirection],
    };
  }, [trend]);

  // Get role-specific styling
  const roleStyle = useMemo(() => {
    if (!userRole) return null;
    return USER_ROLES[userRole] || null;
  }, [userRole]);

  // Get payment method styling
  const paymentStyle = useMemo(() => {
    if (!paymentMethod) return null;
    return PAYMENT_METHODS[paymentMethod] || null;
  }, [paymentMethod]);

  // Animated number counter
  useEffect(() => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    Animated.timing(numberAnim, {
      toValue: numValue,
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, animationDuration, numberAnim]);

  const animatedNumber = numberAnim.interpolate({
    inputRange: [0, typeof value === 'string' ? parseFloat(value) : value],
    outputRange: ['0', formattedValue],
  });

  // Handle press animations with analytics
  const handlePressIn = useCallback(() => {
    if (!interactive) return;
    
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  }, [interactive, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (!interactive) return;
    
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [interactive, scaleAnim]);

  const handlePress = useCallback(() => {
    if (!interactive) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Track analytics for Ethiopian market
    analyticsService.trackEvent('stats_card_pressed', {
      card_title: title,
      card_value: value,
      chart_type: chartType,
      user_role: userRole,
      payment_method: paymentMethod,
      city: city,
    });
    
    onPress?.();
  }, [interactive, onPress, title, value, chartType, userRole, paymentMethod, city]);

  const handleLongPress = useCallback(() => {
    if (!interactive) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  }, [interactive, onLongPress]);

  // Render Ethiopian market specific badges
  const renderMarketBadges = () => {
    return (
      <View style={styles.badgesContainer}>
        {premium && (
          <View style={[styles.premiumBadge, { backgroundColor: '#F59E0B20' }]}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={[styles.premiumBadgeText, { color: '#F59E0B' }]}>
              Premium
            </Text>
          </View>
        )}
        {city && (
          <View style={[styles.cityBadge, { backgroundColor: '#10B98120' }]}>
            <Ionicons name="location" size={10} color="#10B981" />
            <Text style={[styles.cityBadgeText, { color: '#10B981' }]}>
              {city}
            </Text>
          </View>
        )}
        {paymentMethod && (
          <View style={[styles.paymentBadge, { backgroundColor: paymentStyle?.color + '20' }]}>
            <Ionicons name="card" size={10} color={paymentStyle?.color} />
            <Text style={[styles.paymentBadgeText, { color: paymentStyle?.color }]}>
              {paymentStyle?.name}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Render trend indicator with Ethiopian styling
  const renderTrend = () => {
    if (!showTrend || !trendData) return null;

    return (
      <View style={styles.trendContainer}>
        <MaterialIcons
          name={trendData.icon}
          size={sizeConfig.subtitleSize}
          color={trendData.color}
        />
        <Text style={[styles.trendText, { color: trendData.color, fontSize: sizeConfig.subtitleSize }]}>
          {trendData.value}%
        </Text>
      </View>
    );
  };

  // Render comparison with Ethiopian context
  const renderComparison = () => {
    if (!showComparison || !comparison) return null;

    const isPositive = comparison.value >= 0;
    const comparisonColor = isPositive ? '#10B981' : '#EF4444'; // Ethiopian colors

    return (
      <View style={styles.comparisonContainer}>
        <Text style={[styles.comparisonText, { color: theme.colors.textSecondary, fontSize: sizeConfig.subtitleSize }]}>
          vs previous: 
        </Text>
        <Text style={[styles.comparisonValue, { color: comparisonColor, fontSize: sizeConfig.subtitleSize }]}>
          {isPositive ? '+' : ''}{comparison.value}%
        </Text>
      </View>
    );
  };

  // Render target progress for Ethiopian market
  const renderTargetProgress = () => {
    if (!showTarget || !target) return null;

    const progress = (value / target) * 100;
    const isAchieved = progress >= 100;

    return (
      <View style={styles.targetContainer}>
        <View style={styles.targetProgressBar}>
          <View 
            style={[
              styles.targetProgressFill,
              { 
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: isAchieved ? '#10B981' : color, // Ethiopian green
              }
            ]} 
          />
        </View>
        <Text style={[styles.targetText, { color: theme.colors.textSecondary, fontSize: sizeConfig.subtitleSize }]}>
          {progress.toFixed(1)}% of target
        </Text>
      </View>
    );
  };

  // Render Ethiopian payment methods chart
  const renderPaymentChart = () => {
    if (!data || data.length === 0) return null;

    const chartSize = sizeConfig.chartHeight;
    const radius = chartSize / 2 - 5;
    const center = chartSize / 2;

    let total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) total = 1;

    let startAngle = 0;
    const segments = data.map((item, index) => {
      const paymentConfig = PAYMENT_METHODS[item.paymentMethod] || { color: '#6B7280', name: item.paymentMethod };
      const angle = (item.value / total) * 360;
      const endAngle = startAngle + angle;

      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      startAngle = endAngle;

      return (
        <Path
          key={index}
          d={pathData}
          fill={paymentConfig.color}
          onPress={() => {
            setTooltipData({ ...item, name: paymentConfig.name });
            setShowTooltip(true);
          }}
        />
      );
    });

    return (
      <Svg width={chartSize} height={chartSize}>
        {segments}
        {/* Center text for total */}
        <SvgText
          x={center}
          y={center}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize="10"
          fontWeight="bold"
          fill={theme.colors.text}
        >
          Total
        </SvgText>
      </Svg>
    );
  };

  // Render user roles chart for Ethiopian market
  const renderUserRolesChart = () => {
    if (!data || data.length === 0) return null;

    const chartWidth = SCREEN_WIDTH * 0.3;
    const chartHeight = sizeConfig.chartHeight;
    const padding = 10;
    const barWidth = (chartWidth - 2 * padding) / data.length - 2;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;

    return (
      <Svg width={chartWidth} height={chartHeight}>
        {data.map((item, index) => {
          const roleConfig = USER_ROLES[item.role] || { color: '#6B7280', name: item.role };
          const barHeight = ((item.value - minValue) / valueRange) * (chartHeight - 2 * padding);
          const x = padding + index * (barWidth + 2);
          const y = chartHeight - padding - barHeight;

          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={roleConfig.color}
              rx={2}
              onPress={() => {
                setTooltipData({ ...item, name: roleConfig.name });
                setShowTooltip(true);
              }}
            />
          );
        })}
      </Svg>
    );
  };

  // Render construction projects chart
  const renderConstructionChart = () => {
    if (!data || data.length === 0) return null;

    const chartWidth = SCREEN_WIDTH * 0.3;
    const chartHeight = sizeConfig.chartHeight;
    const padding = 10;

    const maxValue = Math.max(...data.map(d => d.progress || d.value));
    const minValue = Math.min(...data.map(d => d.progress || d.value));
    const valueRange = maxValue - minValue || 1;

    const points = data.map((point, index) => {
      const progress = point.progress || point.value;
      const x = padding + (index * (chartWidth - 2 * padding)) / (data.length - 1);
      const y = chartHeight - padding - ((progress - minValue) / valueRange) * (chartHeight - 2 * padding);
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    return (
      <Svg width={chartWidth} height={chartHeight}>
        <Path
          d={points}
          fill="none"
          stroke="#10B981" // Ethiopian green for construction
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Project milestones */}
        {data.map((point, index) => {
          const progress = point.progress || point.value;
          const x = padding + (index * (chartWidth - 2 * padding)) / (data.length - 1);
          const y = chartHeight - padding - ((progress - minValue) / valueRange) * (chartHeight - 2 * padding);
          
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="#10B981"
              onPress={() => {
                setTooltipData(point);
                setShowTooltip(true);
              }}
            />
          );
        })}
      </Svg>
    );
  };

  // Render chart based on type with Ethiopian market support
  const renderChart = () => {
    if (compact) return null;

    switch (chartType) {
      case 'line':
        return renderConstructionChart(); // Use construction chart for line type
      case 'bar':
        return renderUserRolesChart(); // Use user roles chart for bar type
      case 'pie':
      case 'donut':
        return renderPaymentChart(); // Use payment chart for pie/donut types
      case 'payment':
        return renderPaymentChart();
      case 'users':
        return renderUserRolesChart();
      case 'construction':
        return renderConstructionChart();
      case 'progress':
        return renderProgressChart();
      default:
        return null;
    }
  };

  // Render progress chart for Ethiopian market
  const renderProgressChart = () => {
    const progress = typeof value === 'string' ? parseFloat(value) : value;
    const maxProgress = target || 100;
    const progressPercent = (progress / maxProgress) * 100;

    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: animatedValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', `${progressPercent}%`],
                }),
                backgroundColor: color,
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.colors.textSecondary, fontSize: sizeConfig.subtitleSize }]}>
          {progressPercent.toFixed(1)}%
        </Text>
      </View>
    );
  };

  // Render tooltip with Ethiopian market data
  const renderTooltip = () => {
    if (!showTooltip || !tooltipData) return null;

    return (
      <View style={[styles.tooltip, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.tooltipTitle, { color: theme.colors.text }]}>
          {tooltipData.label || tooltipData.name || tooltipData.projectName}
        </Text>
        <Text style={[styles.tooltipValue, { color: theme.colors.text }]}>
          {tooltipData.value || tooltipData.progress}
          {tooltipData.unit || (format === 'percentage' ? '%' : '')}
          {tooltipData.paymentMethod ? ` (${PAYMENT_METHODS[tooltipData.paymentMethod]?.name})` : ''}
        </Text>
        {tooltipData.city && (
          <Text style={[styles.tooltipCity, { color: theme.colors.textSecondary }]}>
            {tooltipData.city}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: sizeConfig.height,
          padding: sizeConfig.padding,
          backgroundColor: theme.colors.card,
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
          borderLeftWidth: roleStyle ? 4 : 0,
          borderLeftColor: roleStyle?.color,
        },
        compact && styles.compactContainer,
        style,
      ]}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.touchableArea}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!interactive}
        activeOpacity={interactive ? 0.8 : 1}
        accessibilityLabel={`${title}: ${formattedValue}. ${subtitle}. ${trendData ? `${trendData.direction} trend` : ''}. ${city ? `Location: ${city}` : ''}`}
        accessibilityRole="button"
      >
        {/* Header with Ethiopian badges */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.colors.textSecondary, fontSize: sizeConfig.titleSize }]}>
              {title}
            </Text>
            {renderMarketBadges()}
          </View>
          {renderTrend()}
        </View>

        {/* Main Value */}
        <View style={styles.valueContainer}>
          {chartType === 'number' ? (
            <Animated.Text style={[styles.value, { color: theme.colors.text, fontSize: sizeConfig.valueSize }]}>
              {animatedNumber}
            </Animated.Text>
          ) : (
            <Text style={[styles.value, { color: theme.colors.text, fontSize: sizeConfig.valueSize }]}>
              {formattedValue}
            </Text>
          )}
        </View>

        {/* Subtitle and Comparison */}
        <View style={styles.footer}>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontSize: sizeConfig.subtitleSize }]}>
              {subtitle}
            </Text>
          )}
          {renderComparison()}
        </View>

        {/* Chart */}
        {renderChart()}

        {/* Target Progress */}
        {renderTargetProgress()}
      </TouchableOpacity>

      {/* Tooltip */}
      {renderTooltip()}
    </Animated.View>
  );
};

// Enhanced Stats Card Grid Component for Ethiopian Market
const StatsCardGrid = ({
  cards = [],
  columns = 2,
  spacing = 12,
  title = "Platform Analytics 🇪🇹",
  showEthiopianSummary = true,
  ...props
}) => {
  const { theme } = useTheme();

  const gridStyle = useMemo(() => ({
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing / 2,
  }), [spacing]);

  const cardStyle = useMemo(() => ({
    width: `${100 / columns}%`,
    padding: spacing / 2,
  }), [columns, spacing]);

  // Calculate Ethiopian market summary
  const ethiopianSummary = useMemo(() => {
    if (!showEthiopianSummary) return null;
    
    const totalRevenue = cards.reduce((sum, card) => {
      if (card.format === 'etb') {
        const value = typeof card.value === 'string' ? parseFloat(card.value) : card.value;
        return sum + value;
      }
      return sum;
    }, 0);

    const totalUsers = cards.reduce((sum, card) => {
      if (card.userRole) {
        const value = typeof card.value === 'string' ? parseFloat(card.value) : card.value;
        return sum + value;
      }
      return sum;
    }, 0);

    const activeProjects = cards.reduce((sum, card) => {
      if (card.chartType === 'construction') {
        const value = typeof card.value === 'string' ? parseFloat(card.value) : card.value;
        return sum + value;
      }
      return sum;
    }, 0);

    return {
      totalRevenue,
      totalUsers,
      activeProjects,
    };
  }, [cards, showEthiopianSummary]);

  if (cards.length === 0) {
    return (
      <View style={[styles.emptyGrid, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="stats-chart" size={48} color={theme.colors.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No statistics available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.gridContainer}>
      {title && (
        <View style={styles.gridHeader}>
          <Text style={[styles.gridTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          {ethiopianSummary && (
            <View style={styles.summaryContainer}>
              <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
                Total: ETB {ethiopianSummary.totalRevenue.toLocaleString()} • 
                {ethiopianSummary.totalUsers} Users • 
                {ethiopianSummary.activeProjects} Projects
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={gridStyle}>
        {cards.map((card, index) => (
          <View key={card.id || index} style={cardStyle}>
            <StatsCard {...card} {...props} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  compactContainer: {
    padding: 12,
  },
  touchableArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cityBadgeText: {
    fontSize: 9,
    fontWeight: '500',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  paymentBadgeText: {
    fontSize: 9,
    fontWeight: '500',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontWeight: '600',
  },
  valueContainer: {
    marginBottom: 4,
  },
  value: {
    fontWeight: '700',
    lineHeight: 1.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  subtitle: {
    fontWeight: '500',
    flex: 1,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comparisonText: {
    fontWeight: '500',
  },
  comparisonValue: {
    fontWeight: '600',
  },
  targetContainer: {
    marginTop: 8,
  },
  targetProgressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  targetProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  targetText: {
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontWeight: '600',
    minWidth: 40,
  },
  tooltip: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    padding: 8,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  tooltipCity: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  gridContainer: {
    marginBottom: 16,
  },
  gridHeader: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  gridTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyGrid: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default StatsCard;
export { 
  StatsCardGrid, 
  CHART_TYPES, 
  TREND_DIRECTIONS, 
  PAYMENT_METHODS, 
  USER_ROLES 
};