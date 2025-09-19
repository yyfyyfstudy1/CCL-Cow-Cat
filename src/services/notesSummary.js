import { db } from './firebase';
import { getAuth } from 'firebase/auth';
import { collectionGroup, query, where, orderBy, limit, startAfter, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

// 分页获取当前用户的笔记（含对话内容、翻译）
export async function getUserNotesPage(page = 1, pageSize = 10, lastDoc = null) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('未登录');
  console.log('开始查询笔记，用户ID:', user.uid, '页码:', page, '是否有lastDoc:', !!lastDoc);
  
  let q;
  if (page === 1) {
    // 第一页：直接查询
    q = query(
      collectionGroup(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
  } else {
    // 后续页面：使用 startAfter
    if (!lastDoc) {
      throw new Error('分页查询需要提供上一页的最后一个文档');
    }
    q = query(
      collectionGroup(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }
  
  console.log('查询条件:', {
    collection: 'notes (collectionGroup)',
    userId: user.uid,
    page,
    pageSize,
    useStartAfter: page > 1
  });
  
  try {
    const snap = await getDocs(q);
    console.log('查询结果:', {
      totalDocs: snap.size,
      empty: snap.empty,
      docs: snap.docs.map(d => ({
        id: d.id,
        path: d.ref.path,
        data: d.data()
      }))
    });
    
    if (snap.empty) {
      console.log('未找到更多笔记');
      return { notes: [], allLoaded: true, lastDoc: null };
    }
    
    const notes = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        ref: doc.ref,
        path: doc.ref.path
      };
    });
    console.log('处理后的笔记列表:', notes);
    
    // 获取对话内容
    const notesWithDialog = await Promise.all(notes.map(async note => {
      try {
        if (!note.path) {
          console.error('笔记缺少路径信息:', note);
          return {
            ...note,
            dialogId: 'error',
            dialogOriginal: '',
            dialogTranslation: ''
          };
        }
        
        // 从路径中提取 dialogId: users/{uid}/dialogs/{dialogId}/notes/{noteId}
        const pathParts = note.path.split('/');
        if (pathParts.length < 6) {
          console.error('笔记路径格式不正确:', note.path);
          return {
            ...note,
            dialogId: 'error',
            dialogOriginal: '',
            dialogTranslation: ''
          };
        }
        
        const dialogId = pathParts[3]; // 使用固定索引获取 dialogId
        const dialogRef = doc(db, 'users', user.uid, 'dialogs', dialogId);
        const dialogSnap = await getDoc(dialogRef);
        
        const result = {
          ...note,
          dialogId,
          dialogOriginal: dialogSnap.exists() ? dialogSnap.data().originalText || '' : '',
          dialogTranslation: dialogSnap.exists() ? dialogSnap.data().translationText || '' : ''
        };
        
        console.log('获取到对话内容:', {
          noteId: note.id,
          dialogId,
          hasDialogContent: dialogSnap.exists(),
          dialogData: dialogSnap.exists() ? dialogSnap.data() : null
        });
        
        return result;
      } catch (error) {
        console.error('获取对话内容失败:', error, note);
        return {
          ...note,
          dialogId: 'error',
          dialogOriginal: '',
          dialogTranslation: ''
        };
      }
    }));
    
    // 获取最后一个文档用于下次分页
    const lastDocument = snap.docs[snap.docs.length - 1];
    const allLoaded = snap.docs.length < pageSize; // 如果返回的文档数少于pageSize，说明没有更多数据
    
    console.log('最终返回结果:', {
      notesCount: notesWithDialog.length,
      allLoaded,
      lastDoc: lastDocument ? lastDocument.id : null,
      firstNote: notesWithDialog[0] ? {
        id: notesWithDialog[0].id,
        text: notesWithDialog[0].text,
        hasDialogContent: !!notesWithDialog[0].dialogOriginal
      } : null
    });
    
    return { 
      notes: notesWithDialog, 
      allLoaded, 
      lastDoc: lastDocument 
    };
  } catch (error) {
    console.error('查询笔记失败:', error);
    // 检查是否是索引错误
    if (error.code === 'failed-precondition') {
      console.error('需要创建复合索引，请按照以下链接创建索引:', error.message);
      throw new Error('需要在 Firestore 中创建复合索引，请联系管理员。');
    }
    throw error;
  }
}

// 获取当前用户该页的AI整理结果
export async function getNotesSummaryPage(page) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('未登录');
  const ref = doc(db, 'users', user.uid, 'notes_summary', String(page));
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().markdown : '';
}

// 保存当前用户该页的AI整理结果
export async function saveNotesSummaryPage(page, markdown) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('未登录');
  const ref = doc(db, 'users', user.uid, 'notes_summary', String(page));
  await setDoc(ref, { markdown, updatedAt: Date.now() });
  return true;
} 