"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Paperclip,
  AlignLeft,
  X,
  AlertCircle,
  Flag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// --- TİPLER ---
interface Task {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date?: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  progress: number;
  deadline: string;
  customers: { company_name: string };
}

export default function KanbanPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FORM STATE ---
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DETAY MODAL STATE ---
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Verileri Çek
  const fetchData = async () => {
    if (!params.id) return;
    const { data: projData } = await supabase
      .from("projects")
      .select("*, customers(company_name)")
      .eq("id", params.id)
      .single();
    if (projData) setProject(projData);

    const { data: taskData } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", params.id);
    if (taskData) setTasks(taskData as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  // --- GÜNCELLENMİŞ AKILLI SIRALAMA (TARİH > ÖNCELİK) ---
  const sortTasks = (taskList: Task[]) => {
    return taskList.sort((a, b) => {
      // 1. KRİTER: TARİH VARLIĞI
      // Tarihi olanlar her zaman olmayanların önüne geçsin
      if (a.due_date && !b.due_date) return -1; // a öne
      if (!a.due_date && b.due_date) return 1; // b öne

      // 2. KRİTER: TARİH YAKINLIĞI
      // İkisinin de tarihi varsa, tarihi yakın olan öne geçsin
      if (a.due_date && b.due_date) {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        if (dateA !== dateB) {
          return dateA - dateB; // Küçük (Eski/Yakın) tarih öne
        }
      }

      // 3. KRİTER: ÖNCELİK (Tarihler eşitse veya yoksa)
      // High > Medium > Low
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      // @ts-ignore
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  };

  const getTasksByStatus = (status: string) => {
    const filtered = tasks.filter((t) => t.status === status);
    return sortTasks(filtered);
  };

  // --- SÜRÜKLE BIRAK ---
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const newStatus = destination.droppableId as Task["status"];

    // Optimistic Update
    const updatedTasks = tasks.map((t) =>
      t.id === draggableId ? { ...t, status: newStatus } : t
    );
    setTasks(updatedTasks);

    // İlerleme Hesapla
    const total = updatedTasks.length;
    const done = updatedTasks.filter((t) => t.status === "done").length;
    const newProgress = total === 0 ? 0 : Math.round((done / total) * 100);

    // DB Güncelle
    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", draggableId);
    await supabase
      .from("projects")
      .update({ progress: newProgress })
      .eq("id", params.id);
    if (project) setProject({ ...project, progress: newProgress });
  };

  // --- YENİ GÖREV EKLE ---
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title) return;

    let imageUrl = null;
    if (fileInputRef.current?.files?.length) {
      setUploading(true);
      const file = fileInputRef.current.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${params.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file);
      if (uploadError) {
        toast.error("Resim yüklenemedi.");
        setUploading(false);
        return;
      }
      const { data } = supabase.storage
        .from("task-attachments")
        .getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("tasks").insert([
      {
        project_id: params.id,
        title: newTaskData.title,
        description: newTaskData.description,
        image_url: imageUrl,
        status: "todo",
        priority: newTaskData.priority,
        due_date: newTaskData.due_date || null,
      },
    ]);

    setUploading(false);
    if (error) toast.error("Hata oluştu.");
    else {
      toast.success("Görev eklendi.");
      setNewTaskData({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsAddOpen(false);
      fetchData();
    }
  };

  // --- GÖREV SİL ---
  const handleDeleteTask = async (id: string) => {
    if (!confirm("Görevi silmek istiyor musunuz?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    const updatedTasks = tasks.filter((t) => t.id !== id);
    setTasks(updatedTasks);
    const total = updatedTasks.length;
    const done = updatedTasks.filter((t) => t.status === "done").length;
    const newProgress = total === 0 ? 0 : Math.round((done / total) * 100);
    if (project) setProject({ ...project, progress: newProgress });
    await supabase
      .from("projects")
      .update({ progress: newProgress })
      .eq("id", params.id);
    setIsDetailOpen(false);
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Yükleniyor...
      </div>
    );
  if (!project)
    return <div className="p-10 text-red-600 dark:text-red-500">Proje bulunamadı.</div>;

  return (
    <div className="space-y-6 p-8 h-[calc(100vh-100px)] flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-card/80 dark:bg-slate-950/50 p-6 rounded-2xl border border-border backdrop-blur-md shrink-0 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {project.name}
            </h1>
            <Badge
              variant="outline"
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
            >
              Active
            </Badge>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground pl-11">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Teslim:{" "}
              {new Date(project.deadline).toLocaleDateString("tr-TR")}
            </span>
            <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" /> {project.progress}%
              Tamamlandı
            </span>
          </div>
        </div>
        <div className="w-1/3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Proje İlerlemesi</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>
      </div>

      {/* KANBAN BOARD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          {["todo", "in_progress", "done"].map((colId) => (
            <Droppable key={colId} droppableId={colId}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex flex-col rounded-xl h-full max-h-full overflow-hidden border ${
                    colId === "todo"
                      ? "bg-muted/30 dark:bg-slate-900/40 border-border"
                      : colId === "in_progress"
                      ? "bg-blue-50/50 dark:bg-blue-900/5 border-blue-200/50 dark:border-blue-900/20"
                      : "bg-green-50/50 dark:bg-green-900/5 border-green-200/50 dark:border-green-900/20"
                  }`}
                >
                  <div
                    className={`p-4 border-b flex justify-between items-center shrink-0 ${
                      colId === "todo"
                        ? "border-border bg-muted/50 dark:bg-slate-900/60"
                        : colId === "in_progress"
                        ? "border-blue-200/50 dark:border-blue-900/20 bg-blue-100/50 dark:bg-blue-900/10"
                        : "border-green-200/50 dark:border-green-900/20 bg-green-100/50 dark:bg-green-900/10"
                    }`}
                  >
                    <h3
                      className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wider ${
                        colId === "todo"
                          ? "text-foreground/80"
                          : colId === "in_progress"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          colId === "todo"
                            ? "bg-muted-foreground"
                            : colId === "in_progress"
                            ? "bg-blue-500 animate-pulse"
                            : "bg-green-500"
                        }`}
                      />
                      {colId === "todo"
                        ? "Yapılacaklar"
                        : colId === "in_progress"
                        ? "Sürüyor"
                        : "Tamamlandı"}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({getTasksByStatus(colId).length})
                      </span>
                    </h3>

                    {colId === "todo" && (
                      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Yeni Kart Oluştur</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={handleAddTask}
                            className="space-y-4 mt-2"
                          >
                            <div className="space-y-2">
                              <Label>Başlık</Label>
                              <Input
                                className="bg-muted/50 border-border"
                                value={newTaskData.title}
                                onChange={(e) =>
                                  setNewTaskData({
                                    ...newTaskData,
                                    title: e.target.value,
                                  })
                                }
                                autoFocus
                                placeholder="Örn: Ana Sayfa Tasarımı"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Öncelik</Label>
                                <Select
                                  onValueChange={(val) =>
                                    setNewTaskData({
                                      ...newTaskData,
                                      priority: val as any,
                                    })
                                  }
                                  defaultValue="medium"
                                >
                                  <SelectTrigger className="bg-muted/50 border-border">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border">
                                    <SelectItem value="low">Düşük</SelectItem>
                                    <SelectItem value="medium">Orta</SelectItem>
                                    <SelectItem value="high">
                                      Yüksek 🔥
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Bitiş Tarihi</Label>
                                <Input
                                  type="date"
                                  className="bg-muted/50 border-border"
                                  value={newTaskData.due_date}
                                  onChange={(e) =>
                                    setNewTaskData({
                                      ...newTaskData,
                                      due_date: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Açıklama</Label>
                              <Textarea
                                className="bg-muted/50 border-border resize-none h-20"
                                value={newTaskData.description}
                                onChange={(e) =>
                                  setNewTaskData({
                                    ...newTaskData,
                                    description: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Kapak Görseli</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                className="bg-muted/50 border-border text-xs"
                                ref={fileInputRef}
                              />
                            </div>
                            <Button
                              type="submit"
                              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                              disabled={uploading}
                            >
                              {uploading ? "Yükleniyor..." : "Kartı Ekle"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2 min-h-0">
                    {getTasksByStatus(colId).map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        onOpenDetail={openTaskDetail}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* GÖREV DETAY MODALI */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border p-0 overflow-hidden flex flex-col max-h-[85vh]">
          {selectedTask && (
            <>
              {selectedTask.image_url && (
                <div className="h-48 w-full bg-muted relative border-b border-border shrink-0">
                  <img
                    src={selectedTask.image_url}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold text-foreground leading-snug">
                    {selectedTask.title}
                  </h2>
                  <Badge
                    variant="outline"
                    className={`shrink-0 ${
                      selectedTask.priority === "high"
                        ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"
                        : selectedTask.priority === "medium"
                        ? "bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {selectedTask.priority === "high"
                      ? "Yüksek Öncelik"
                      : selectedTask.priority === "medium"
                      ? "Orta Öncelik"
                      : "Düşük Öncelik"}
                  </Badge>
                </div>
                {selectedTask.due_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/50 p-2 rounded-lg border border-border w-fit">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>
                      Bitiş:{" "}
                      <span className="text-foreground font-medium">
                        {new Date(selectedTask.due_date).toLocaleDateString(
                          "tr-TR"
                        )}
                      </span>
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <AlignLeft className="w-4 h-4" /> Açıklama
                  </h3>
                  <div className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border border-border min-h-[100px]">
                    {selectedTask.description || (
                      <span className="text-muted-foreground italic">
                        Açıklama girilmemiş.
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border bg-muted/50 flex justify-between items-center shrink-0">
                <div className="text-xs text-muted-foreground">
                  ID: {selectedTask.id.slice(0, 8)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Görevi Sil
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Kapat
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- KART BİLEŞENİ ---
function TaskCard({
  task,
  index,
  onOpenDetail,
}: {
  task: Task;
  index: number;
  onOpenDetail: (task: Task) => void;
}) {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== "done";

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpenDetail(task)}
          className={`group relative rounded-lg border transition-all overflow-hidden cursor-pointer
                        ${
                          snapshot.isDragging
                            ? "bg-card shadow-2xl rotate-2 scale-105 border-primary z-50 ring-2 ring-primary/50"
                            : "bg-card border-border hover:border-primary/50 hover:shadow-lg"
                        }
                        ${
                          task.status === "done"
                            ? "opacity-60 hover:opacity-100"
                            : ""
                        }
                    `}
        >
          {task.image_url && (
            <div className="h-32 w-full bg-muted relative border-b border-border">
              <img
                src={task.image_url}
                className="w-full h-full object-cover"
                alt="Cover"
              />
            </div>
          )}
          <div className="p-3">
            <div className="flex gap-2 mb-2">
              {task.priority === "high" && (
                <div
                  className="h-1.5 w-8 rounded-full bg-red-500 dark:shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                  title="Yüksek Öncelik"
                />
              )}
              {task.priority === "medium" && (
                <div
                  className="h-1.5 w-8 rounded-full bg-orange-500"
                  title="Orta Öncelik"
                />
              )}
              {task.priority === "low" && (
                <div
                  className="h-1.5 w-8 rounded-full bg-blue-400 dark:bg-blue-500/50"
                  title="Düşük Öncelik"
                />
              )}
            </div>
            <div className="flex justify-between items-start gap-2">
              <p
                className={`text-sm font-medium leading-snug ${
                  task.status === "done"
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {task.title}
              </p>
            </div>
            <div className="flex items-center justify-between mt-3 text-muted-foreground">
              <div className="flex items-center gap-3">
                {task.description && <AlignLeft className="w-3 h-3" />}
                {task.image_url && <Paperclip className="w-3 h-3" />}
              </div>
              {task.due_date && (
                <div
                  className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    isOverdue
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Clock className="w-3 h-3" />{" "}
                  {new Date(task.due_date).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
