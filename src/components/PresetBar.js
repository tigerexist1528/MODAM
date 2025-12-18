import React from 'react';

// App.js에서 필요한 데이터와 함수들을 Props로 다 받아옵니다.
const PresetBar = ({ 
  presetList, 
  currentPresetId, 
  isReordering, 
  setIsReordering, 
  onLoad,       // loadPreset 함수
  onSave,       // handleSaveClick 함수
  onDelete,     // handleDeleteClick 함수
  onShare,      // handleShareClick 함수
  onNew,        // handleNewClick 함수
  onImport,     // handleImportClick 함수
  onMove        // movePreset 함수
}) => {
  
  // 아이콘 이미지 주소 생성기
  const getIconUrl = (jobName) => 
    `https://raw.githubusercontent.com/HyeokjaeLee/Dg-mobile-calc/main/images/preset/icon/${jobName}.png`;

  return (
    <div className="preset-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#111', borderBottom: '1px solid #333' }}>
      
      {/* 좌측: 프리셋 리스트 */}
      <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', alignItems: 'center', flex: 1, paddingBottom: '4px', scrollbarWidth: 'none', marginRight: '20px' }}>
         
         {/* [+] 새 프리셋 */}
         {!isReordering && (
             <div onClick={onNew} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: '50px' }}>
               <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px dashed #666', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '20px', background: '#151515' }}>+</div>
               <span style={{ fontSize: '0.7rem', marginTop: '4px', color: '#777' }}>New</span>
             </div>
         )}

         {/* 프리셋 아이콘들 */}
         {presetList.map((p, index) => {
             const job = p.data.character?.jobName || "공용";
             const nick = p.data.character?.nickname || p.name;
             const isActive = currentPresetId === p.id;
             return (
               <div key={p.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '50px' }}>
                  <div 
                      onClick={() => !isReordering && onLoad(p)}
                      style={{ 
                          width: '44px', height: '44px', borderRadius: '50%', 
                          border: isActive ? '2px solid #ffcc00' : '2px solid #333', 
                          overflow: 'hidden', background: '#000', position: 'relative',
                          opacity: (isActive || isReordering) ? 1 : 0.5,
                          cursor: isReordering ? 'default' : 'pointer', transition: '0.2s'
                      }}
                  >
                      <img src={getIconUrl(job)} onError={(e)=>{e.target.style.display='none'}} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      {/* 편집 모드 화살표 */}
                      {isReordering && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                              <button onClick={(e) => { e.stopPropagation(); onMove(index, -1); }} disabled={index === 0} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '14px', cursor: 'pointer', padding: '0 4px', opacity: index === 0 ? 0.3 : 1 }}>◀</button>
                              <button onClick={(e) => { e.stopPropagation(); onMove(index, 1); }} disabled={index === presetList.length - 1} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '14px', cursor: 'pointer', padding: '0 4px', opacity: index === presetList.length - 1 ? 0.3 : 1 }}>▶</button>
                          </div>
                      )}
                      
                      {/* 클라우드 아이콘 */}
                      {p.type === 'cloud' && !isReordering && <div style={{position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#0055aa', borderRadius: '50%', border: '1px solid #000'}}></div>}
                  </div>
                  <span style={{ fontSize: '0.7rem', marginTop: '4px', color: isActive ? '#ffcc00' : '#888', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nick}</span>
               </div>
             );
         })}
      </div>

      {/* 우측: 버튼 그룹 */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
         <button onClick={() => setIsReordering(!isReordering)} style={{ background: isReordering ? '#2563eb' : '#333', border: '1px solid #555', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>{isReordering ? "완료" : "⚙️"}</button>
         
         {!isReordering && (
           <>
             <div style={{ width: '1px', height: '24px', background: '#444', margin: '0 4px' }}></div>
             <button onClick={onImport} style={{ background: '#333', border: '1px solid #555', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>📥</button>
             <button onClick={onShare} style={{ background: '#222', border: '1px solid #555', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>📤 공유</button>
             <button onClick={onSave} style={{ background: '#ffcc00', border: 'none', color: '#000', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>💾 저장</button>
             <button onClick={onDelete} style={{ background: '#991b1b', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️</button>
           </>
         )}
      </div>
    </div>
  );
};

export default PresetBar;