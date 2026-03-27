import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../../components/ui';
import { useTheme } from '../../contexts/theme-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

export default function ImageModal({
  visible = false,
  images = [],
  initialIndex = 0,
  onClose,
  showIndicators = true,
  showDownload = true,
  showShare = true,
  enableZoom = true,
  enableSwipe = true,
  title = '',
  description = '',
}) {
  const { theme, colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  const currentImage = images[currentIndex];

  // Zoom animation
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Pan responder for zoom and swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableZoom || enableSwipe,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return enableZoom || enableSwipe;
      },
      onPanResponderGrant: () => {
        if (enableZoom) {
          pan.setValue({ x: 0, y: 0 });
        }
      },
      onPanResponderMove: enableZoom 
        ? Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })
        : undefined,
      onPanResponderRelease: (evt, gestureState) => {
        if (enableZoom && isZoomed) {
          // Check for double tap to zoom out
          if (gestureState.numberActiveTouches === 1) {
            const { dx, dy } = gestureState;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 10) {
              // Double tap detected
              handleDoubleTap();
            }
          }
        } else if (enableSwipe && !isZoomed) {
          // Handle swipe for image navigation
          const { dx } = gestureState;
          if (Math.abs(dx) > 50) {
            if (dx > 0 && currentIndex > 0) {
              goToPrevious();
            } else if (dx < 0 && currentIndex < images.length - 1) {
              goToNext();
            }
          }
        }

        if (enableZoom) {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const handleDoubleTap = () => {
    if (!enableZoom) return;

    const toValue = isZoomed ? 1 : 2;
    const translateToValue = isZoomed ? 0 : 100;

    Animated.parallel([
      Animated.spring(zoomAnim, {
        toValue,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: translateToValue,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    setIsZoomed(!isZoomed);
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsLoading(true);
      setError(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsLoading(true);
      setError(false);
    }
  };

  const handleClose = () => {
    Animated.timing(opacityValue, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      onClose?.();
      setIsZoomed(false);
      zoomAnim.setValue(1);
      translateY.setValue(0);
      setCurrentIndex(initialIndex);
    });
  };

  React.useEffect(() => {
    if (visible) {
      StatusBar.setHidden(true, 'fade');
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      StatusBar.setHidden(false, 'fade');
    }

    return () => {
      StatusBar.setHidden(false, 'fade');
    };
  }, [visible]);

  const handleDownload = async () => {
    // Implementation for image download
    // This would integrate with your download service
    console.log('Download image:', currentImage.uri);
  };

  const handleShare = async () => {
    // Implementation for image sharing
    // This would integrate with your sharing service
    console.log('Share image:', currentImage.uri);
  };

  const renderImage = () => (
    <Animated.View
      style={[
        styles.imageContainer,
        {
          transform: [
            { scale: zoomAnim },
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Image
        source={{ uri: currentImage.uri }}
        style={styles.image}
        contentFit={isZoomed ? 'contain' : 'cover'}
        transition={300}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      )}
      
      {error && (
        <View style={styles.errorOverlay}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <ThemedText style={styles.errorText}>Failed to load image</ThemedText>
        </View>
      )}
    </Animated.View>
  );

  const renderIndicators = () => {
    if (!showIndicators || images.length <= 1) return null;

    return (
      <View style={styles.indicatorsContainer}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentIndex 
                  ? colors.primary 
                  : 'rgba(255,255,255,0.4)',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNavigationArrows = () => {
    if (images.length <= 1 || isZoomed) return null;

    return (
      <>
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.navArrow, styles.prevArrow]}
            onPress={goToPrevious}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {currentIndex < images.length - 1 && (
          <TouchableOpacity
            style={[styles.navArrow, styles.nextArrow]}
            onPress={goToNext}
          >
            <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderHeader = () => (
    <BlurView intensity={80} tint="dark" style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {title && (
            <ThemedText style={styles.title} numberOfLines={1}>
              {title}
            </ThemedText>
          )}
          {description && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {description}
            </ThemedText>
          )}
        </View>
        
        <View style={styles.headerActions}>
          {showShare && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {showDownload && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownload}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BlurView>
  );

  const renderFooter = () => (
    <BlurView intensity={80} tint="dark" style={styles.footer}>
      {renderIndicators()}
      
      <View style={styles.imageInfo}>
        <ThemedText style={styles.imageCounter}>
          {currentIndex + 1} / {images.length}
        </ThemedText>
        
        {enableZoom && (
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={handleDoubleTap}
          >
            <ThemedText style={styles.zoomText}>
              {isZoomed ? 'Zoom Out' : 'Zoom In'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <BlurView
          intensity={50}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        <Animated.View
          style={[
            styles.content,
            {
              opacity: opacityValue,
            },
          ]}
        >
          {renderHeader()}
          
          <View style={styles.imageWrapper}>
            {renderImage()}
            {renderNavigationArrows()}
          </View>
          
          {renderFooter()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    maxHeight: '80%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevArrow: {
    left: 20,
  },
  nextArrow: {
    right: 20,
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  imageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  zoomButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

// Specialized image modal components
export const PortfolioImageModal = (props) => (
  <ImageModal
    showDownload={false}
    showShare={true}
    enableZoom={true}
    showIndicators={true}
    {...props}
  />
);

export const ServiceImageModal = (props) => (
  <ImageModal
    showDownload={false}
    showShare={true}
    enableZoom={true}
    showIndicators={true}
    {...props}
  />
);

export const GovernmentDocumentModal = (props) => (
  <ImageModal
    showDownload={true}
    showShare={false}
    enableZoom={true}
    showIndicators={false}
    {...props}
  />
);

export const ConstructionPlanModal = (props) => (
  <ImageModal
    showDownload={true}
    showShare={true}
    enableZoom={true}
    showIndicators={true}
    title="Construction Plan"
    {...props}
  />
);