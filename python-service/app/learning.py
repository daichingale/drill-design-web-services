"""
ドリル学習システム: パターン抽出・分析・提案
"""
import json
import os
from typing import Optional, Dict, List, Any
from pathlib import Path
import numpy as np
from pydantic import BaseModel


# データ保存先（簡易版: ファイルベース、後でDBに移行可能）
LEARNING_DATA_DIR = Path(__file__).parent.parent / "data" / "learning"
LEARNING_DATA_DIR.mkdir(parents=True, exist_ok=True)


class DrillSet(BaseModel):
    id: str
    startCount: float
    endCount: Optional[float] = None
    section: Optional[str] = None  # intro, verse, chorus, bridge, outro
    positions: Dict[str, Dict[str, float]]  # {memberId: {x, y}}
    formationType: Optional[str] = None
    features: Optional[Dict[str, float]] = None


class Transition(BaseModel):
    fromSetId: str
    toSetId: str
    duration: float
    movementType: Optional[str] = None
    maxDistance: Optional[float] = None
    avgDistance: Optional[float] = None
    rotation: Optional[float] = None


class DrillData(BaseModel):
    drillId: str
    title: Optional[str] = None
    metadata: Dict[str, Any]
    members: List[Dict[str, Any]]
    sets: List[DrillSet]
    transitions: Optional[List[Transition]] = None
    patterns: Optional[List[Dict[str, Any]]] = None


def calculate_formation_type(positions: Dict[str, Dict[str, float]]) -> str:
    """フォーメーションタイプを判定"""
    if len(positions) < 3:
        return "custom"
    
    pos_list = list(positions.values())
    xs = [p["x"] for p in pos_list]
    ys = [p["y"] for p in pos_list]
    
    # 中心を計算
    center_x = np.mean(xs)
    center_y = np.mean(ys)
    
    # 中心からの距離
    distances = [np.sqrt((p["x"] - center_x)**2 + (p["y"] - center_y)**2) for p in pos_list]
    avg_distance = np.mean(distances)
    std_distance = np.std(distances)
    
    # 円形判定: 距離のばらつきが小さい
    if std_distance / (avg_distance + 1e-6) < 0.3:
        return "circle"
    
    # 直線判定: XまたはYのばらつきが小さい
    std_x = np.std(xs)
    std_y = np.std(ys)
    if std_x / (std_y + 1e-6) < 0.3:
        return "line"
    if std_y / (std_x + 1e-6) < 0.3:
        return "line"
    
    # グリッド判定: ある程度整列している
    if std_x > 0 and std_y > 0:
        # 簡易判定: グリッドっぽい
        return "grid"
    
    return "custom"


def calculate_features(positions: Dict[str, Dict[str, float]]) -> Dict[str, float]:
    """フォーメーションの特徴量を計算"""
    if len(positions) < 2:
        return {
            "symmetry": 0.0,
            "spread": 0.0,
            "rotation": 0.0
        }
    
    pos_list = list(positions.values())
    xs = [p["x"] for p in pos_list]
    ys = [p["y"] for p in pos_list]
    
    # 中心
    center_x = np.mean(xs)
    center_y = np.mean(ys)
    
    # 散開度（中心からの平均距離）
    distances = [np.sqrt((p["x"] - center_x)**2 + (p["y"] - center_y)**2) for p in pos_list]
    spread = np.mean(distances)
    
    # 対称性スコア（簡易版: X軸対称性）
    # 実際にはもっと複雑な計算が必要
    symmetry = 0.5  # デフォルト値
    
    return {
        "symmetry": float(symmetry),
        "spread": float(spread),
        "rotation": 0.0
    }


def calculate_transition(
    from_positions: Dict[str, Dict[str, float]],
    to_positions: Dict[str, Dict[str, float]],
    duration: float
) -> Transition:
    """セット間の遷移を計算"""
    # 共通メンバーの移動距離を計算
    common_members = set(from_positions.keys()) & set(to_positions.keys())
    
    if not common_members:
        return Transition(
            fromSetId="",
            toSetId="",
            duration=duration,
            movementType="unknown"
        )
    
    distances = []
    for member_id in common_members:
        from_pos = from_positions[member_id]
        to_pos = to_positions[member_id]
        dist = np.sqrt(
            (to_pos["x"] - from_pos["x"])**2 +
            (to_pos["y"] - from_pos["y"])**2
        )
        distances.append(dist)
    
    max_distance = float(np.max(distances)) if distances else 0.0
    avg_distance = float(np.mean(distances)) if distances else 0.0
    
    # 移動タイプ判定
    if avg_distance < 2.0:
        movement_type = "static"
    elif avg_distance < 5.0:
        movement_type = "smooth"
    else:
        movement_type = "expand"  # 簡易判定
    
    return Transition(
        fromSetId="",
        toSetId="",
        duration=duration,
        movementType=movement_type,
        maxDistance=max_distance,
        avgDistance=avg_distance,
        rotation=0.0
    )


def save_drill_for_learning(drill_data: DrillData) -> Dict[str, Any]:
    """ドリルデータを学習用に保存"""
    # セットにフォーメーションタイプと特徴量を追加
    processed_sets = []
    for i, set_data in enumerate(drill_data.sets):
        formation_type = calculate_formation_type(set_data.positions)
        features = calculate_features(set_data.positions)
        
        processed_set = DrillSet(
            **set_data.dict(),
            formationType=formation_type,
            features=features
        )
        processed_sets.append(processed_set)
    
    # 遷移を計算
    transitions = []
    for i in range(len(processed_sets) - 1):
        from_set = processed_sets[i]
        to_set = processed_sets[i + 1]
        duration = to_set.startCount - from_set.startCount
        
        transition = calculate_transition(
            from_set.positions,
            to_set.positions,
            duration
        )
        transition.fromSetId = from_set.id
        transition.toSetId = to_set.id
        transitions.append(transition)
    
    # 保存
    drill_data.sets = processed_sets
    drill_data.transitions = transitions
    
    # ファイルに保存
    file_path = LEARNING_DATA_DIR / f"{drill_data.drillId}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(drill_data.dict(), f, ensure_ascii=False, indent=2)
    
    return {
        "success": True,
        "drillId": drill_data.drillId,
        "patternsExtracted": len(transitions),
        "message": "ドリルを学習データとして保存しました"
    }


def load_learned_patterns(user_id: Optional[str] = None) -> Dict[str, Any]:
    """学習済みパターンを読み込み"""
    # 簡易版: 全ドリルを読み込んで統計を計算
    drills = []
    for file_path in LEARNING_DATA_DIR.glob("*.json"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                drill_data = json.load(f)
                drills.append(drill_data)
        except Exception:
            continue
    
    if not drills:
        return {
            "patterns": [],
            "sectionPreferences": {},
            "statistics": {
                "totalDrills": 0,
                "totalSets": 0,
                "avgSetsPerDrill": 0
            }
        }
    
    # 統計を計算
    total_sets = sum(len(d["sets"]) for d in drills)
    formation_counts = {}
    transition_counts = {}
    section_stats = {}
    
    for drill in drills:
        for set_data in drill.get("sets", []):
            formation = set_data.get("formationType", "custom")
            formation_counts[formation] = formation_counts.get(formation, 0) + 1
            
            section = set_data.get("section")
            if section:
                if section not in section_stats:
                    section_stats[section] = {
                        "count": 0,
                        "formations": {},
                        "avgMovementDistance": []
                    }
                section_stats[section]["count"] += 1
                section_stats[section]["formations"][formation] = \
                    section_stats[section]["formations"].get(formation, 0) + 1
        
        for transition in drill.get("transitions", []):
            movement_type = transition.get("movementType", "unknown")
            transition_counts[movement_type] = transition_counts.get(movement_type, 0) + 1
            
            section = transition.get("section")
            if section and section in section_stats:
                avg_dist = transition.get("avgDistance", 0)
                if avg_dist > 0:
                    section_stats[section]["avgMovementDistance"].append(avg_dist)
    
    # セクション別の平均移動距離を計算
    for section in section_stats:
        distances = section_stats[section]["avgMovementDistance"]
        if distances:
            section_stats[section]["avgMovementDistance"] = float(np.mean(distances))
        else:
            section_stats[section]["avgMovementDistance"] = 0.0
    
    return {
        "patterns": [],  # 後で実装
        "sectionPreferences": section_stats,
        "statistics": {
            "totalDrills": len(drills),
            "totalSets": total_sets,
            "avgSetsPerDrill": total_sets / len(drills) if drills else 0,
            "mostUsedFormation": max(formation_counts.items(), key=lambda x: x[1])[0] if formation_counts else None,
            "mostUsedTransition": max(transition_counts.items(), key=lambda x: x[1])[0] if transition_counts else None
        }
    }

